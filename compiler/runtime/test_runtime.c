#include "runtime.h"

int main() {
    /* Refcounted string */
    Str a = str_rc_new("hello", 5);
    Str b = str_retain(a);  /* rc = 2 */
    Str c = str_slice(a, 1, 4);  /* "ell", rc = 3 (shares buffer) */

    printf("a: %.*s (rc=%d)\n", a.len, a.data, rc_header(a.rc_buf)->rc);
    printf("c: %.*s (rc=%d)\n", c.len, c.data, rc_header(c.rc_buf)->rc);

    str_release(&c);  /* rc = 2 */
    str_release(&b);  /* rc = 1 */
    str_release(&a);  /* rc = 0, freed */

    /* Refcounted array */
    StrArr arr = StrArr_new();
    StrArr_push(&arr, str_rc_new("one", 3));
    StrArr_push(&arr, str_rc_new("two", 3));
    StrArr_push(&arr, str_lit("three"));  /* not refcounted */
    printf("arr.len = %d\n", arr.len);

    StrArr arr2 = StrArr_retain(arr);  /* shared, rc = 2 */
    printf("shared rc = %d\n", rc_header(arr.data)->rc);

    StrArr_release(&arr2);  /* rc = 1 */
    StrArr_release_deep(&arr);  /* rc = 0, frees array + owned strings */

    printf("done\n");
    return 0;
}
