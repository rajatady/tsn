/*
 * TSN Runtime — Hash Map and Set
 *
 * Open-addressing hash table with linear probing.
 * Generated via DEFINE_MAP / DEFINE_SET macros, one per concrete type pair.
 *
 * Keys must be primitive types (string, number, boolean).
 * Values can be any TSN type.
 *
 * Layout: parallel arrays for keys, values, and occupancy flags.
 * Grows at 75% load factor. Tombstone-free deletion via backward shift.
 */

#ifndef TSN_RUNTIME_MAP_H
#define TSN_RUNTIME_MAP_H

/* ─── Hash functions for primitive key types ───────────────────── */

static inline unsigned int tsn_hash_str(Str s) {
    unsigned int h = 2166136261u;
    for (int i = 0; i < s.len; i++) {
        h ^= (unsigned char)s.data[i];
        h *= 16777619u;
    }
    return h;
}

static inline bool tsn_eq_str(Str a, Str b) {
    return str_eq(a, b);
}

static inline unsigned int tsn_hash_double(double d) {
    if (d == 0) return 0;
    unsigned int h;
    memcpy(&h, &d, sizeof(h));
    return h * 2654435761u;
}

static inline bool tsn_eq_double(double a, double b) {
    return a == b;
}

static inline unsigned int tsn_hash_bool(bool b) {
    return b ? 1 : 0;
}

static inline bool tsn_eq_bool(bool a, bool b) {
    return a == b;
}

/* ─── DEFINE_MAP macro ─────────────────────────────────────────── */

#define DEFINE_MAP(Name, KeyType, ValType, hash_fn, eq_fn)              \
    typedef struct {                                                     \
        KeyType *keys;                                                   \
        ValType *vals;                                                   \
        bool *occupied;                                                  \
        int len;                                                         \
        int cap;                                                         \
    } Name;                                                              \
                                                                         \
    static inline Name Name##_new(void) {                                \
        Name m;                                                          \
        m.cap = 16;                                                      \
        m.len = 0;                                                       \
        m.keys = (KeyType *)calloc(m.cap, sizeof(KeyType));              \
        m.vals = (ValType *)calloc(m.cap, sizeof(ValType));              \
        m.occupied = (bool *)calloc(m.cap, sizeof(bool));                \
        return m;                                                        \
    }                                                                    \
                                                                         \
    static inline void Name##_set(Name *m, KeyType key, ValType val);    \
                                                                         \
    static inline void Name##_grow(Name *m) {                            \
        int oldcap = m->cap;                                             \
        KeyType *oldkeys = m->keys;                                      \
        ValType *oldvals = m->vals;                                      \
        bool *oldocc = m->occupied;                                      \
        m->cap = oldcap * 2;                                             \
        m->keys = (KeyType *)calloc(m->cap, sizeof(KeyType));            \
        m->vals = (ValType *)calloc(m->cap, sizeof(ValType));            \
        m->occupied = (bool *)calloc(m->cap, sizeof(bool));              \
        m->len = 0;                                                      \
        for (int i = 0; i < oldcap; i++) {                               \
            if (oldocc[i]) {                                             \
                Name##_set(m, oldkeys[i], oldvals[i]);                   \
            }                                                            \
        }                                                                \
        free(oldkeys); free(oldvals); free(oldocc);                      \
    }                                                                    \
                                                                         \
    static inline void Name##_set(Name *m, KeyType key, ValType val) {   \
        if (m->len * 4 >= m->cap * 3) Name##_grow(m);                   \
        unsigned int idx = hash_fn(key) % (unsigned int)m->cap;          \
        while (m->occupied[idx]) {                                       \
            if (eq_fn(m->keys[idx], key)) {                              \
                m->vals[idx] = val;                                      \
                return;                                                  \
            }                                                            \
            idx = (idx + 1) % (unsigned int)m->cap;                      \
        }                                                                \
        m->keys[idx] = key;                                              \
        m->vals[idx] = val;                                              \
        m->occupied[idx] = true;                                         \
        m->len++;                                                        \
    }                                                                    \
                                                                         \
    static inline bool Name##_has(Name *m, KeyType key) {                \
        unsigned int idx = hash_fn(key) % (unsigned int)m->cap;          \
        int checked = 0;                                                 \
        while (m->occupied[idx] && checked < m->cap) {                   \
            if (eq_fn(m->keys[idx], key)) return true;                   \
            idx = (idx + 1) % (unsigned int)m->cap;                      \
            checked++;                                                   \
        }                                                                \
        return false;                                                    \
    }                                                                    \
                                                                         \
    static inline ValType Name##_get(Name *m, KeyType key) {             \
        unsigned int idx = hash_fn(key) % (unsigned int)m->cap;          \
        int checked = 0;                                                 \
        while (m->occupied[idx] && checked < m->cap) {                   \
            if (eq_fn(m->keys[idx], key)) return m->vals[idx];           \
            idx = (idx + 1) % (unsigned int)m->cap;                      \
            checked++;                                                   \
        }                                                                \
        ValType zero; memset(&zero, 0, sizeof(ValType));                 \
        return zero;                                                     \
    }                                                                    \
                                                                         \
    static inline bool Name##_delete(Name *m, KeyType key) {             \
        unsigned int idx = hash_fn(key) % (unsigned int)m->cap;          \
        int checked = 0;                                                 \
        while (m->occupied[idx] && checked < m->cap) {                   \
            if (eq_fn(m->keys[idx], key)) {                              \
                m->occupied[idx] = false;                                \
                memset(&m->keys[idx], 0, sizeof(KeyType));               \
                memset(&m->vals[idx], 0, sizeof(ValType));               \
                m->len--;                                                \
                /* Rehash forward entries that may have collided */       \
                unsigned int j = (idx + 1) % (unsigned int)m->cap;       \
                while (m->occupied[j]) {                                 \
                    KeyType rk = m->keys[j];                             \
                    ValType rv = m->vals[j];                             \
                    m->occupied[j] = false;                              \
                    m->len--;                                            \
                    Name##_set(m, rk, rv);                               \
                    j = (j + 1) % (unsigned int)m->cap;                  \
                }                                                        \
                return true;                                             \
            }                                                            \
            idx = (idx + 1) % (unsigned int)m->cap;                      \
            checked++;                                                   \
        }                                                                \
        return false;                                                    \
    }                                                                    \
                                                                         \
    static inline void Name##_release(Name *m) {                         \
        free(m->keys); free(m->vals); free(m->occupied);                 \
        m->keys = NULL; m->vals = NULL; m->occupied = NULL;              \
        m->len = 0; m->cap = 0;                                         \
    }

/* ─── DEFINE_SET macro (Map with bool dummy value) ─────────────── */

#define DEFINE_SET(Name, ElemType, hash_fn, eq_fn)                       \
    DEFINE_MAP(Name##__inner, ElemType, bool, hash_fn, eq_fn)            \
    typedef struct { Name##__inner _m; } Name;                           \
    static inline Name Name##_new(void) {                                \
        Name s; s._m = Name##__inner_new(); return s;                    \
    }                                                                    \
    static inline void Name##_add(Name *s, ElemType elem) {              \
        Name##__inner_set(&s->_m, elem, true);                           \
    }                                                                    \
    static inline bool Name##_has(Name *s, ElemType elem) {              \
        return Name##__inner_has(&s->_m, elem);                          \
    }                                                                    \
    static inline bool Name##_delete(Name *s, ElemType elem) {           \
        return Name##__inner_delete(&s->_m, elem);                       \
    }                                                                    \
    static inline void Name##_release(Name *s) {                         \
        Name##__inner_release(&s->_m);                                   \
    }

/* Set .size access is s._m.len — the codegen emits this directly */

#endif /* TSN_RUNTIME_MAP_H */
