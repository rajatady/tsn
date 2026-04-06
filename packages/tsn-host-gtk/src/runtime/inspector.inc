/* ─── Inspector (Dev Tools) — GTK4 version ──────────────────────── */

#include <sys/socket.h>
#include <sys/un.h>
#include <pthread.h>

static char *inspector_socket_path(void) {
    static char path[256];
    snprintf(path, sizeof(path), "/tmp/strictts-inspect-%d.sock", getpid());
    return path;
}

static GHashTable *g_element_ids_gtk = NULL;

void ui_set_id(UIHandle v, const char *element_id) {
    if (!g_element_ids_gtk) g_element_ids_gtk = g_hash_table_new(g_str_hash, g_str_equal);
    g_hash_table_insert(g_element_ids_gtk, g_strdup(element_id), v);
    gtk_widget_set_name(GTK_WIDGET(v), element_id);
}

static void dump_tree_gtk(GtkWidget *widget, int depth, GString *out) {
    if (!widget) return;

    char indent[128] = {0};
    for (int i = 0; i < depth * 2 && i < 126; i++) indent[i] = ' ';

    int w = gtk_widget_get_width(widget);
    int h = gtk_widget_get_height(widget);

    if (GTK_IS_LABEL(widget)) {
        const char *text = gtk_label_get_text(GTK_LABEL(widget));
        char trunc[44];
        if (strlen(text) > 40) { strncpy(trunc, text, 40); trunc[40] = '\0'; strcat(trunc, "..."); }
        else strncpy(trunc, text, sizeof(trunc) - 1);
        g_string_append_printf(out, "%sText \"%s\" (%dx%d)\n", indent, trunc, w, h);
    } else if (GTK_IS_BUTTON(widget)) {
        const char *label = gtk_button_get_label(GTK_BUTTON(widget));
        g_string_append_printf(out, "%sButton \"%s\" (%dx%d)\n", indent, label ? label : "", w, h);
    } else if (GTK_IS_BOX(widget)) {
        GtkOrientation orient = gtk_orientable_get_orientation(GTK_ORIENTABLE(widget));
        const char *type = orient == GTK_ORIENTATION_VERTICAL ? "VStack" : "HStack";
        g_string_append_printf(out, "%s%s (%dx%d)\n", indent, type, w, h);
    } else if (GTK_IS_SCROLLED_WINDOW(widget)) {
        g_string_append_printf(out, "%sScrollView (%dx%d)\n", indent, w, h);
    } else if (GTK_IS_SEARCH_ENTRY(widget)) {
        g_string_append_printf(out, "%sSearch (%dx%d)\n", indent, w, h);
    } else if (GTK_IS_WINDOW(widget)) {
        const char *title = gtk_window_get_title(GTK_WINDOW(widget));
        g_string_append_printf(out, "%sWindow \"%s\" (%dx%d)\n", indent, title ? title : "", w, h);
    } else {
        g_string_append_printf(out, "%s%s (%dx%d)\n", indent, G_OBJECT_TYPE_NAME(widget), w, h);
    }

    /* Recurse into children */
    GtkWidget *child = gtk_widget_get_first_child(widget);
    while (child) {
        dump_tree_gtk(child, depth + 1, out);
        child = gtk_widget_get_next_sibling(child);
    }
}

static char *handle_command_gtk(const char *cmd_str) {
    while (*cmd_str == ' ' || *cmd_str == '\n' || *cmd_str == '\r') cmd_str++;
    char cmd[1024];
    strncpy(cmd, cmd_str, sizeof(cmd) - 1);
    cmd[sizeof(cmd) - 1] = '\0';
    int len = strlen(cmd);
    while (len > 0 && (cmd[len-1] == '\n' || cmd[len-1] == '\r' || cmd[len-1] == ' ')) cmd[--len] = '\0';

    if (strcmp(cmd, "tree") == 0) {
        if (!g_root_window) return strdup("No window\n");
        GString *out = g_string_new("");
        dump_tree_gtk(GTK_WIDGET(g_root_window), 0, out);
        return g_string_free(out, FALSE);
    }

    if (strcmp(cmd, "help") == 0) {
        return strdup(
            "Commands:\n"
            "  tree          — dump widget hierarchy\n"
            "  help          — this message\n"
        );
    }

    char *result = (char *)malloc(256);
    snprintf(result, 256, "Unknown command: %s\nType 'help' for usage.\n", cmd);
    return result;
}

static void *inspector_thread(void *arg) {
    char *sock_path = inspector_socket_path();
    unlink(sock_path);

    int fd = socket(AF_UNIX, SOCK_STREAM, 0);
    if (fd < 0) { perror("[inspector] socket"); return NULL; }

    struct sockaddr_un addr;
    memset(&addr, 0, sizeof(addr));
    addr.sun_family = AF_UNIX;
    strncpy(addr.sun_path, sock_path, sizeof(addr.sun_path) - 1);

    if (bind(fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) { perror("[inspector] bind"); close(fd); return NULL; }
    if (listen(fd, 2) < 0) { perror("[inspector] listen"); close(fd); return NULL; }

    fprintf(stderr, "[inspector] Listening on %s\n", sock_path);

    while (1) {
        int client = accept(fd, NULL, NULL);
        if (client < 0) continue;

        char buf[1024];
        ssize_t n = read(client, buf, sizeof(buf) - 1);
        if (n > 0) {
            buf[n] = '\0';
            char *resp = handle_command_gtk(buf);
            if (resp) {
                write(client, resp, strlen(resp));
                free(resp);
            }
        }
        close(client);
    }
    return NULL;
}

void ui_inspector_start(void) {
    pthread_t tid;
    pthread_create(&tid, NULL, inspector_thread, NULL);
    pthread_detach(tid);
}
