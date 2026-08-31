"""
VNS Labs — PySpark teaching shim (pure Python, runs inside Pyodide).

Implements the subset of the PySpark DataFrame API that the PGCP-BDA syllabus
uses, so students write REAL PySpark syntax and get auto-graded output.

It is NOT Spark: no cluster, no lazy DAG, no partitions, no catalyst optimiser.
Everything is eager and in-memory. Semantics chosen to match Spark 3.4+ where
they differ (notably show() renders nulls as NULL).
"""

import builtins as _bi
from functools import reduce as _reduce

_MISSING = object()


# ────────────────────────────────────────────────────────────── Row
class Row(tuple):
    """Ordered, immutable record. Supports r.name, r['name'], r[0]."""

    def __new__(cls, *args, **kw):
        if args and kw:
            raise ValueError("Row cannot mix positional and keyword fields")
        if kw:
            fields = list(kw.keys())
            values = [kw[f] for f in fields]
        else:
            fields, values = None, list(args)
        self = super().__new__(cls, values)
        self.__fields__ = fields
        return self

    def __getattr__(self, item):
        if item.startswith("__"):
            raise AttributeError(item)
        f = self.__dict__.get("__fields__")
        if f and item in f:
            return self[f.index(item)]
        raise AttributeError(item)

    def __getitem__(self, item):
        if isinstance(item, str):
            f = self.__fields__ or []
            if item not in f:
                raise KeyError(item)
            return tuple.__getitem__(self, f.index(item))
        return tuple.__getitem__(self, item)

    def asDict(self, recursive=False):
        f = self.__fields__ or []
        return {k: v for k, v in zip(f, self)}

    def __repr__(self):
        f = self.__fields__
        if not f:
            return "<Row(%s)>" % ", ".join(repr(v) for v in self)
        return "Row(%s)" % ", ".join("%s=%r" % (k, v) for k, v in zip(f, self))


# ─────────────────────────────────────────────────────────── Column
class Column:
    """A lazily-evaluated expression over one row."""

    def __init__(self, fn, name="col", agg=None):
        self._fn = fn          # dict -> value
        self._name = name
        self._agg = agg        # (kind, Column) when this is an aggregate

    # -- evaluation ------------------------------------------------
    def _eval(self, row):
        return self._fn(row)

    def _binop(self, other, op, sym, rev=False):
        o = other._fn if isinstance(other, Column) else (lambda r, v=other: v)
        on = other._name if isinstance(other, Column) else repr(other)

        def f(r):
            a, b = self._fn(r), o(r)
            if a is None or b is None:
                return None
            return op(b, a) if rev else op(a, b)

        nm = "(%s %s %s)" % ((on, sym, self._name) if rev else (self._name, sym, on))
        return Column(f, nm)

    # arithmetic
    def __add__(self, o):  return self._binop(o, lambda a, b: a + b, "+")
    def __radd__(self, o): return self._binop(o, lambda a, b: a + b, "+", True)
    def __sub__(self, o):  return self._binop(o, lambda a, b: a - b, "-")
    def __rsub__(self, o): return self._binop(o, lambda a, b: a - b, "-", True)
    def __mul__(self, o):  return self._binop(o, lambda a, b: a * b, "*")
    def __rmul__(self, o): return self._binop(o, lambda a, b: a * b, "*", True)
    def __truediv__(self, o):  return self._binop(o, lambda a, b: None if b == 0 else a / b, "/")
    def __rtruediv__(self, o): return self._binop(o, lambda a, b: None if b == 0 else a / b, "/", True)
    def __mod__(self, o):  return self._binop(o, lambda a, b: a % b, "%")
    def __neg__(self):     return Column(lambda r: None if self._fn(r) is None else -self._fn(r), "(- %s)" % self._name)

    # comparison
    def __eq__(self, o):  return self._binop(o, lambda a, b: a == b, "=")
    def __ne__(self, o):  return self._binop(o, lambda a, b: a != b, "!=")
    def __gt__(self, o):  return self._binop(o, lambda a, b: a > b, ">")
    def __lt__(self, o):  return self._binop(o, lambda a, b: a < b, "<")
    def __ge__(self, o):  return self._binop(o, lambda a, b: a >= b, ">=")
    def __le__(self, o):  return self._binop(o, lambda a, b: a <= b, "<=")

    # boolean
    def __and__(self, o): return self._binop(o, lambda a, b: bool(a) and bool(b), "AND")
    def __or__(self, o):  return self._binop(o, lambda a, b: bool(a) or bool(b), "OR")
    def __invert__(self):
        return Column(lambda r: None if self._fn(r) is None else not self._fn(r),
                      "(NOT %s)" % self._name)

    def __hash__(self):
        return id(self)

    # -- helpers ---------------------------------------------------
    def alias(self, name):
        c = Column(self._fn, name, self._agg)
        return c

    name = alias

    def asc(self):  return _SortKey(self, True)
    def desc(self): return _SortKey(self, False)

    def isNull(self):    return Column(lambda r: self._fn(r) is None, "(%s IS NULL)" % self._name)
    def isNotNull(self): return Column(lambda r: self._fn(r) is not None, "(%s IS NOT NULL)" % self._name)

    def isin(self, *vals):
        if len(vals) == 1 and isinstance(vals[0], (list, tuple, set)):
            vals = tuple(vals[0])
        return Column(lambda r: self._fn(r) in vals, "(%s IN ...)" % self._name)

    def between(self, lo, hi):
        return Column(lambda r: (lambda v: v is not None and lo <= v <= hi)(self._fn(r)),
                      "(%s BETWEEN %s AND %s)" % (self._name, lo, hi))

    def cast(self, t):
        t = str(t).lower()
        conv = {"int": int, "integer": int, "long": int, "bigint": int,
                "double": float, "float": float, "string": str, "boolean": bool}
        f = conv.get(t, lambda v: v)

        def g(r):
            v = self._fn(r)
            if v is None:
                return None
            try:
                return f(v)
            except (ValueError, TypeError):
                return None
        return Column(g, self._name)

    def contains(self, s):
        return Column(lambda r: (self._fn(r) or "").find(str(s)) >= 0,
                      "contains(%s)" % self._name)

    def startswith(self, s):
        return Column(lambda r: str(self._fn(r) or "").startswith(str(s)), self._name)

    def endswith(self, s):
        return Column(lambda r: str(self._fn(r) or "").endswith(str(s)), self._name)

    def like(self, pattern):
        import re as _re
        rx = _re.compile("^" + _re.escape(pattern).replace("%", ".*").replace("_", ".") + "$")
        return Column(lambda r: bool(rx.match(str(self._fn(r) or ""))), self._name)

    def __repr__(self):
        return "Column<'%s'>" % self._name


class _SortKey:
    def __init__(self, col, ascending):
        self.col, self.ascending = col, ascending


# ──────────────────────────────────────────────────── functions (F)
def col(name):
    return Column(lambda r, n=name: r.get(n), name)


column = col


def lit(v):
    return Column(lambda r, v=v: v, str(v))


def _as_col(x):
    return x if isinstance(x, Column) else col(x) if isinstance(x, str) else lit(x)


def _agg(kind, c, label=None):
    c = _as_col(c)
    out = Column(c._fn, label or "%s(%s)" % (kind, c._name))
    out._agg = (kind, c)
    return out


def _sum(c):            return _agg("sum", c)
def _min(c):            return _agg("min", c)
def _max(c):            return _agg("max", c)
def avg(c):             return _agg("avg", c)
def mean(c):            return _agg("avg", c)
def count(c="*"):
    c = _as_col(c) if not (isinstance(c, str) and c == "*") else lit(1)
    out = Column(c._fn, "count(1)" if c._name == "1" else "count(%s)" % c._name)
    out._agg = ("count", c)
    return out


def countDistinct(c):   return _agg("countDistinct", c, "count(DISTINCT %s)" % _as_col(c)._name)
def collect_list(c):    return _agg("collect_list", c)
def collect_set(c):     return _agg("collect_set", c)


def upper(c):  c = _as_col(c); return Column(lambda r: None if c._fn(r) is None else str(c._fn(r)).upper(), "upper(%s)" % c._name)
def lower(c):  c = _as_col(c); return Column(lambda r: None if c._fn(r) is None else str(c._fn(r)).lower(), "lower(%s)" % c._name)
def length(c): c = _as_col(c); return Column(lambda r: None if c._fn(r) is None else len(str(c._fn(r))), "length(%s)" % c._name)
def trim(c):   c = _as_col(c); return Column(lambda r: None if c._fn(r) is None else str(c._fn(r)).strip(), "trim(%s)" % c._name)


def abs(c):
    c = _as_col(c)
    return Column(lambda r: None if c._fn(r) is None else _bi.abs(c._fn(r)), "abs(%s)" % c._name)


def round(c, scale=0):
    c = _as_col(c)

    def f(r):
        v = c._fn(r)
        if v is None:
            return None
        rv = _bi.round(float(v), scale)
        return int(rv) if scale == 0 and float(rv).is_integer() else rv
    return Column(f, "round(%s, %d)" % (c._name, scale))


def concat(*cs):
    cs = [_as_col(c) for c in cs]

    def f(r):
        parts = [c._fn(r) for c in cs]
        return None if any(p is None for p in parts) else "".join(str(p) for p in parts)
    return Column(f, "concat(%s)" % ", ".join(c._name for c in cs))


def concat_ws(sep, *cs):
    cs = [_as_col(c) for c in cs]
    return Column(lambda r: str(sep).join(str(c._fn(r)) for c in cs if c._fn(r) is not None),
                  "concat_ws(%s)" % ", ".join(c._name for c in cs))


def desc(c): return _as_col(c).desc()
def asc(c):  return _as_col(c).asc()


class _When:
    def __init__(self, pairs, default=None):
        self._pairs, self._default = pairs, default

    def when(self, cond, val):
        return _When(self._pairs + [(cond, _as_col(val))], self._default)

    def otherwise(self, val):
        return _build_case(self._pairs, _as_col(val))

    # allow a bare when(...) to be used as a Column
    def __getattr__(self, item):
        return getattr(_build_case(self._pairs, None), item)


def _build_case(pairs, default):
    def f(r):
        for cond, val in pairs:
            if cond._fn(r):
                return val._fn(r)
        return default._fn(r) if default is not None else None
    return Column(f, "CASE WHEN ... END")


def when(cond, val):
    return _When([(cond, _as_col(val))])


class _F:
    """Namespace so `from pyspark.sql import functions as F` works."""
    col = staticmethod(col)
    column = staticmethod(col)
    lit = staticmethod(lit)
    sum = staticmethod(_sum)
    min = staticmethod(_min)
    max = staticmethod(_max)
    avg = staticmethod(avg)
    mean = staticmethod(mean)
    count = staticmethod(count)
    countDistinct = staticmethod(countDistinct)
    collect_list = staticmethod(collect_list)
    collect_set = staticmethod(collect_set)
    upper = staticmethod(upper)
    lower = staticmethod(lower)
    length = staticmethod(length)
    trim = staticmethod(trim)
    abs = staticmethod(abs)
    round = staticmethod(round)
    concat = staticmethod(concat)
    concat_ws = staticmethod(concat_ws)
    when = staticmethod(when)
    desc = staticmethod(desc)
    asc = staticmethod(asc)


functions = _F


# ─────────────────────────────────────────────────────── DataFrame
def _fmt(v):
    if v is None:
        return "NULL"
    if v is True:
        return "true"
    if v is False:
        return "false"
    if isinstance(v, float):
        return repr(v) if v != int(v) or _bi.abs(v) >= 1e16 else "%.1f" % v
    return str(v)


class DataFrame:
    def __init__(self, rows, columns):
        self._rows = rows            # list[dict]
        self.columns = list(columns)

    # -- basics ----------------------------------------------------
    def count(self):
        return len(self._rows)

    def collect(self):
        return [Row(**{c: r.get(c) for c in self.columns}) for r in self._rows]

    def take(self, n):
        return self.collect()[:n]

    def head(self, n=None):
        rs = self.collect()
        if n is None:
            return rs[0] if rs else None
        return rs[:n]

    def first(self):
        return self.head()

    def limit(self, n):
        return DataFrame(self._rows[:n], self.columns)

    def distinct(self):
        seen, out = set(), []
        for r in self._rows:
            k = tuple(r.get(c) for c in self.columns)
            if k not in seen:
                seen.add(k)
                out.append(r)
        return DataFrame(out, self.columns)

    dropDuplicates = distinct

    # -- projection ------------------------------------------------
    def select(self, *cols):
        if len(cols) == 1 and isinstance(cols[0], (list, tuple)):
            cols = tuple(cols[0])
        specs = []
        for c in cols:
            if isinstance(c, str):
                if c == "*":
                    specs.extend((n, col(n)) for n in self.columns)
                else:
                    specs.append((c, col(c)))
            else:
                specs.append((c._name, c))
        names = [n for n, _ in specs]
        rows = [{n: c._eval(r) for n, c in specs} for r in self._rows]
        return DataFrame(rows, names)

    def withColumn(self, name, expr):
        expr = _as_col(expr)
        cols = self.columns + ([name] if name not in self.columns else [])
        rows = []
        for r in self._rows:
            nr = dict(r)
            nr[name] = expr._eval(r)
            rows.append(nr)
        return DataFrame(rows, cols)

    def withColumnRenamed(self, old, new):
        if old not in self.columns:
            return self
        cols = [new if c == old else c for c in self.columns]
        rows = [{(new if k == old else k): v for k, v in r.items()} for r in self._rows]
        return DataFrame(rows, cols)

    def drop(self, *names):
        names = set(names)
        cols = [c for c in self.columns if c not in names]
        return DataFrame([{c: r.get(c) for c in cols} for r in self._rows], cols)

    # -- filtering -------------------------------------------------
    def filter(self, cond):
        if isinstance(cond, str):
            raise TypeError("SQL-string conditions are not supported in this shim — "
                            "use df.filter(col('x') > 1)")
        return DataFrame([r for r in self._rows if cond._eval(r)], self.columns)

    where = filter

    # -- ordering --------------------------------------------------
    def orderBy(self, *cols, **kw):
        if len(cols) == 1 and isinstance(cols[0], (list, tuple)):
            cols = tuple(cols[0])
        ascending = kw.get("ascending", None)
        keys = []
        for i, c in enumerate(cols):
            if isinstance(c, _SortKey):
                keys.append((c.col, c.ascending))
            else:
                c = _as_col(c)
                asc_i = True
                if isinstance(ascending, (list, tuple)):
                    asc_i = _bi.bool(ascending[i])
                elif ascending is not None:
                    asc_i = _bi.bool(ascending)
                keys.append((c, asc_i))

        rows = list(self._rows)
        for c, asc_i in reversed(keys):
            rows.sort(key=lambda r, c=c: _SortWrap(c._eval(r)), reverse=not asc_i)
        return DataFrame(rows, self.columns)

    sort = orderBy

    # -- grouping --------------------------------------------------
    def groupBy(self, *cols):
        if len(cols) == 1 and isinstance(cols[0], (list, tuple)):
            cols = tuple(cols[0])
        specs = [(c, col(c)) if isinstance(c, str) else (c._name, c) for c in cols]
        return GroupedData(self, specs)

    groupby = groupBy

    def agg(self, *exprs):
        return GroupedData(self, []).agg(*exprs)

    # -- joins -----------------------------------------------------
    def join(self, other, on=None, how="inner"):
        how = (how or "inner").lower()
        if isinstance(on, str):
            on = [on]
        if not isinstance(on, list) or not all(isinstance(k, str) for k in on):
            raise TypeError("this shim supports join(other, on='key') or on=['k1','k2'] only")

        out_cols = self.columns + [c for c in other.columns if c not in on]
        idx = {}
        for r in other._rows:
            idx.setdefault(tuple(r.get(k) for k in on), []).append(r)

        rows, matched = [], set()
        for l in self._rows:
            key = tuple(l.get(k) for k in on)
            hits = idx.get(key, [])
            if hits:
                matched.add(key)
                for rr in hits:
                    m = dict(l)
                    for c in other.columns:
                        if c not in on:
                            m[c] = rr.get(c)
                    rows.append(m)
            elif how in ("left", "leftouter", "left_outer", "full", "outer", "fullouter", "full_outer"):
                m = dict(l)
                for c in other.columns:
                    if c not in on:
                        m[c] = None
                rows.append(m)

        if how in ("right", "rightouter", "right_outer", "full", "outer", "fullouter", "full_outer"):
            for rr in other._rows:
                key = tuple(rr.get(k) for k in on)
                if key not in matched:
                    m = {c: None for c in self.columns}
                    m.update({k: rr.get(k) for k in on})
                    for c in other.columns:
                        if c not in on:
                            m[c] = rr.get(c)
                    rows.append(m)

        return DataFrame([{c: r.get(c) for c in out_cols} for r in rows], out_cols)

    def union(self, other):
        rows = self._rows + [{c: r.get(oc) for c, oc in zip(self.columns, other.columns)}
                             for r in other._rows]
        return DataFrame(rows, self.columns)

    unionAll = union

    def unionByName(self, other):
        return DataFrame(self._rows + [{c: r.get(c) for c in self.columns} for r in other._rows],
                         self.columns)

    # -- output ----------------------------------------------------
    def show(self, n=20, truncate=True, vertical=False):
        print(self._render(n, truncate))

    def _render(self, n=20, truncate=True):
        # Byte-for-byte match with Spark's Dataset.showString:
        # minimum column width 3, cells right-aligned when truncating
        # (left-aligned when truncate=0), no padding spaces around cells.
        width_cap = 20 if truncate is True else (int(truncate) if truncate else 0)
        rows = self._rows[:n]
        cells = [[_fmt(r.get(c)) for c in self.columns] for r in rows]
        if width_cap > 0:
            cells = [[v if len(v) <= width_cap
                      else (v[:width_cap - 3] + "..." if width_cap > 3 else v[:width_cap])
                      for v in row] for row in cells]
        widths = [max(3, len(c), *([len(row[i]) for row in cells] or [0]))
                  for i, c in enumerate(self.columns)]
        pad = (lambda v, w: v.rjust(w)) if width_cap > 0 else (lambda v, w: v.ljust(w))
        sep = "+" + "+".join("-" * w for w in widths) + "+"
        head = "|" + "|".join(pad(c, w) for c, w in zip(self.columns, widths)) + "|"
        body = ["|" + "|".join(pad(v, w) for v, w in zip(row, widths)) + "|" for row in cells]
        out = [sep, head, sep] + body + [sep]
        if len(self._rows) > n:
            out.append("only showing top %d row%s" % (n, "" if n == 1 else "s"))
        return "\n".join(out)

    def printSchema(self):
        print("root")
        for c in self.columns:
            v = next((r.get(c) for r in self._rows if r.get(c) is not None), None)
            t = {int: "long", float: "double", str: "string", bool: "boolean"}.get(type(v), "string")
            print(" |-- %s: %s (nullable = true)" % (c, t))

    @property
    def dtypes(self):
        out = []
        for c in self.columns:
            v = next((r.get(c) for r in self._rows if r.get(c) is not None), None)
            out.append((c, {int: "bigint", float: "double", str: "string", bool: "boolean"}.get(type(v), "string")))
        return out

    def toPandas(self):
        raise NotImplementedError("toPandas() needs real Spark — use collect() in this lab")

    def __getitem__(self, item):
        if isinstance(item, str):
            return col(item)
        raise TypeError("df[...] takes a column name")

    def __getattr__(self, item):
        if item.startswith("_"):
            raise AttributeError(item)
        if item in self.__dict__.get("columns", []):
            return col(item)
        raise AttributeError(item)

    def __repr__(self):
        return "DataFrame[%s]" % ", ".join(self.columns)


class _SortWrap:
    """Sort helper: NULLs first ascending, like Spark."""
    __slots__ = ("v",)

    def __init__(self, v):
        self.v = v

    def __lt__(self, o):
        if self.v is None:
            return o.v is not None
        if o.v is None:
            return False
        return self.v < o.v


class GroupedData:
    def __init__(self, df, key_specs):
        self._df, self._keys = df, key_specs

    def _groups(self):
        out, order = {}, []
        for r in self._df._rows:
            k = tuple(c._eval(r) for _, c in self._keys)
            if k not in out:
                out[k] = []
                order.append(k)
            out[k].append(r)
        return [(k, out[k]) for k in order]

    def agg(self, *exprs):
        if len(exprs) == 1 and isinstance(exprs[0], dict):
            exprs = tuple(_agg(v, k) for k, v in exprs[0].items())
        names = [n for n, _ in self._keys] + [e._name for e in exprs]
        rows = []
        for k, grp in self._groups():
            rec = {n: v for (n, _), v in zip(self._keys, k)}
            for e in exprs:
                rec[e._name] = _apply_agg(e, grp)
            rows.append(rec)
        return DataFrame(rows, names)

    def count(self):
        names = [n for n, _ in self._keys] + ["count"]
        rows = [dict({n: v for (n, _), v in zip(self._keys, k)}, count=len(g))
                for k, g in self._groups()]
        return DataFrame(rows, names)

    def _simple(self, kind, cols):
        if not cols:
            cols = [c for c in self._df.columns if c not in [n for n, _ in self._keys]]
        return self.agg(*[_agg(kind, c) for c in cols])

    def sum(self, *cols): return self._simple("sum", cols)
    def avg(self, *cols): return self._simple("avg", cols)
    def mean(self, *cols): return self._simple("avg", cols)
    def max(self, *cols): return self._simple("max", cols)
    def min(self, *cols): return self._simple("min", cols)


def _apply_agg(expr, rows):
    if expr._agg is None:
        return expr._eval(rows[0]) if rows else None
    kind, c = expr._agg
    vals = [c._eval(r) for r in rows]
    nn = [v for v in vals if v is not None]
    if kind == "count":
        return len(nn)
    if kind == "countDistinct":
        return len(set(nn))
    if not nn:
        return None
    if kind == "sum":
        return _bi.sum(nn)
    if kind == "min":
        return _bi.min(nn)
    if kind == "max":
        return _bi.max(nn)
    if kind == "avg":
        return _bi.sum(nn) / len(nn)
    if kind == "collect_list":
        return nn
    if kind == "collect_set":
        return sorted(set(nn), key=str)
    raise ValueError("unsupported aggregate: %s" % kind)


# ──────────────────────────────────────────────────── SparkSession
class _Builder:
    def appName(self, *_a, **_k): return self
    def master(self, *_a, **_k): return self
    def config(self, *_a, **_k): return self
    def enableHiveSupport(self): return self
    def getOrCreate(self): return SparkSession()


class SparkSession:
    builder = _Builder()

    def __init__(self):
        self.sparkContext = _SparkContext()

    def createDataFrame(self, data, schema=None):
        data = list(data)
        if schema is not None and not isinstance(schema, (list, tuple)):
            schema = [s.strip() for s in str(schema).split(",")]
            schema = [s.split()[0] for s in schema]

        if not data:
            return DataFrame([], list(schema or []))

        first = data[0]
        if isinstance(first, dict):
            cols = list(schema) if schema else list(first.keys())
            rows = [{c: d.get(c) for c in cols} for d in data]
        elif isinstance(first, Row) and first.__fields__:
            cols = list(schema) if schema else list(first.__fields__)
            rows = [dict(zip(r.__fields__, r)) for r in data]
        elif isinstance(first, (list, tuple)):
            cols = list(schema) if schema else ["_%d" % (i + 1) for i in range(len(first))]
            rows = [dict(zip(cols, r)) for r in data]
        else:
            cols = list(schema) if schema else ["value"]
            rows = [{cols[0]: v} for v in data]
        return DataFrame(rows, cols)

    def range(self, start, end=None, step=1):
        if end is None:
            start, end = 0, start
        return DataFrame([{"id": i} for i in range(start, end, step)], ["id"])

    def sql(self, _q):
        raise NotImplementedError(
            "spark.sql() needs a real Spark catalog — use the DataFrame API in this lab")

    def stop(self):
        pass

    read = property(lambda self: _Reader())


class _SparkContext:
    def parallelize(self, data, *_a):
        raise NotImplementedError("RDD API is not part of this lab — use DataFrames")

    def stop(self):
        pass


class _Reader:
    def csv(self, *_a, **_k):
        raise NotImplementedError("File I/O is unavailable in the browser lab — "
                                  "build DataFrames with spark.createDataFrame(...)")
    json = parquet = text = csv


# ─────────────────────────────────────────────────── pyspark.sql.types
class _DataType:
    def __init__(self, name):
        self._name = name

    def __repr__(self):
        return self._name

    def simpleString(self):
        return self._name.replace("Type", "").lower()


def _mk_type(nm):
    def factory():
        return _DataType(nm)
    factory.__name__ = nm
    return factory


StringType = _mk_type("StringType")
IntegerType = _mk_type("IntegerType")
LongType = _mk_type("LongType")
DoubleType = _mk_type("DoubleType")
FloatType = _mk_type("FloatType")
BooleanType = _mk_type("BooleanType")
DateType = _mk_type("DateType")
TimestampType = _mk_type("TimestampType")


class StructField:
    def __init__(self, name, dataType=None, nullable=True):
        self.name, self.dataType, self.nullable = name, dataType, nullable

    def __repr__(self):
        return "StructField(%s)" % self.name


class StructType:
    def __init__(self, fields=None):
        self.fields = list(fields or [])

    def add(self, f, dataType=None, nullable=True):
        self.fields.append(f if isinstance(f, StructField) else StructField(f, dataType, nullable))
        return self

    def fieldNames(self):
        return [f.name for f in self.fields]

    def __iter__(self):
        return iter(self.fields)

    def __len__(self):
        return len(self.fields)


# teach createDataFrame about StructType schemas
_orig_cdf = SparkSession.createDataFrame


def _cdf(self, data, schema=None):
    if isinstance(schema, StructType):
        schema = schema.fieldNames()
    return _orig_cdf(self, data, schema)


SparkSession.createDataFrame = _cdf


# ───────────────────────────────────── register the pyspark namespace
# so real import statements work:
#   from pyspark.sql import SparkSession
#   from pyspark.sql import functions as F
#   from pyspark.sql.functions import col, lit, when
def _install_modules():
    import sys as _sys
    import types as _types

    m_root = _types.ModuleType("pyspark")
    m_sql = _types.ModuleType("pyspark.sql")
    m_fns = _types.ModuleType("pyspark.sql.functions")
    m_typ = _types.ModuleType("pyspark.sql.types")

    for k, v in [("SparkSession", SparkSession), ("DataFrame", DataFrame),
                 ("Row", Row), ("Column", Column), ("GroupedData", GroupedData),
                 ("functions", _F), ("types", m_typ)]:
        setattr(m_sql, k, v)

    for n in dir(_F):
        if not n.startswith("_"):
            setattr(m_fns, n, getattr(_F, n))

    for k, v in [("StringType", StringType), ("IntegerType", IntegerType),
                 ("LongType", LongType), ("DoubleType", DoubleType),
                 ("FloatType", FloatType), ("BooleanType", BooleanType),
                 ("DateType", DateType), ("TimestampType", TimestampType),
                 ("StructField", StructField), ("StructType", StructType)]:
        setattr(m_typ, k, v)

    m_root.sql = m_sql
    m_sql.functions = m_fns
    m_sql.types = m_typ

    _sys.modules["pyspark"] = m_root
    _sys.modules["pyspark.sql"] = m_sql
    _sys.modules["pyspark.sql.functions"] = m_fns
    _sys.modules["pyspark.sql.types"] = m_typ


_install_modules()

# Notebook-style convenience: Databricks / EMR pre-create `spark`, so do we.
spark = SparkSession()

__all__ = ["SparkSession", "DataFrame", "Row", "Column", "functions", "col", "lit", "when"]
