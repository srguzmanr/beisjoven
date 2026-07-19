// Sistema de autenticación para Beisjoven
// Conectado a Supabase Auth — sesiones encriptadas, tokens, password reset

const Auth = {
    currentUser: null,
    _ready: false,
    _readyPromise: null,

    // Inicializar — carga sesión existente de Supabase
    init: function() {
        this._readyPromise = this._loadSession();
        return this._readyPromise;
    },

    _loadSession: async function() {
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session?.user) {
                this.currentUser = this._mapUser(session.user);
            }
        } catch (e) {
            console.error('Error cargando sesión:', e);
            this.currentUser = null;
        }

        // Escuchar cambios de auth (logout en otra pestaña, token refresh, etc.)
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                this.currentUser = this._mapUser(session.user);
            } else {
                this.currentUser = null;
            }
        });

        this._ready = true;
    },

    // Mapear usuario de Supabase al formato que usa el admin panel.
    // SEC-ROLES-01 / EDITOR-20 F7: el rol vive en app_metadata (solo
    // editable server-side). user_metadata JAMÁS se usa para autorización
    // y no hay default permisivo: sin rol = sin privilegios de UI. La
    // seguridad real la ponen RLS y los endpoints; esto alinea la UI.
    _mapUser: function(supaUser) {
        const meta = supaUser.user_metadata || {};
        const appMeta = supaUser.app_metadata || {};
        return {
            id: supaUser.id,
            email: supaUser.email,
            name: meta.name || supaUser.email.split('@')[0],
            role: appMeta.role || null,
            avatar: meta.avatar || '👨‍💼'
        };
    },

    // Login con Supabase Auth
    login: async function(email, password) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password: password
        });

        if (error) {
            return { success: false, error: this._translateError(error.message) };
        }

        this.currentUser = this._mapUser(data.user);
        return { success: true, user: this.currentUser };
    },

    // Cerrar sesión
    logout: async function() {
        await supabaseClient.auth.signOut();
        this.currentUser = null;
    },

    // Solicitar reset de contraseña
    resetPassword: async function(email) {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/login'
        });

        if (error) {
            return { success: false, error: this._translateError(error.message) };
        }
        return { success: true };
    },

    // Verificar si está logueado
    isLoggedIn: function() {
        return this.currentUser !== null;
    },

    // Verificar rol superadmin (roles reales: superadmin | periodista)
    isAdmin: function() {
        return !!(this.currentUser && this.currentUser.role === 'superadmin');
    },

    // Verificar si puede editar (superadmin o periodista)
    canEdit: function() {
        return !!(this.currentUser && ['superadmin', 'periodista'].includes(this.currentUser.role));
    },

    // Obtener usuario actual
    getUser: function() {
        return this.currentUser;
    },

    // Esperar a que Auth esté listo (para usar antes de Router.init)
    whenReady: function() {
        return this._readyPromise || Promise.resolve();
    },

    // Traducir errores comunes de Supabase al español
    _translateError: function(msg) {
        const translations = {
            'Invalid login credentials': 'Email o contraseña incorrectos',
            'Email not confirmed': 'Confirma tu email antes de iniciar sesión',
            'User not found': 'No existe una cuenta con ese email',
            'Too many requests': 'Demasiados intentos. Espera un momento.',
            'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
            'For security purposes, you can only request this after': 'Por seguridad, espera un momento antes de intentar de nuevo'
        };

        for (const [eng, esp] of Object.entries(translations)) {
            if (msg.includes(eng)) return esp;
        }
        return msg;
    }
};

// Exportar
if (typeof window !== 'undefined') {
    window.Auth = Auth;
}
