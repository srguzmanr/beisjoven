// Sistema de autenticación para Beisjoven
// En producción, esto se conectaría a un backend real con JWT/sessions

const Auth = {
    // IMPORTANTE: Cambiar estas credenciales antes de compartir el admin con otros.
    // Para mayor seguridad, migrar a Supabase Auth en el futuro.
    users: [
        {
            id: 1,
            email: 'admin@beisjoven.com',
            password: 'Beisbol2026!Mx',
            name: 'Administrador',
            role: 'admin',
            avatar: '👨‍💼'
        }
    ],

    // Usuario actual (null si no hay sesión)
    currentUser: null,

    // Inicializar - revisar si hay sesión guardada
    init: function() {
        const saved = localStorage.getItem('beisjoven_session');
        if (saved) {
            try {
                this.currentUser = JSON.parse(saved);
            } catch (e) {
                this.currentUser = null;
            }
        }
    },

    // Intentar login
    login: function(email, password) {
        const user = this.users.find(u => 
            u.email.toLowerCase() === email.toLowerCase() && 
            u.password === password
        );

        if (user) {
            // Crear sesión (sin incluir password)
            this.currentUser = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                avatar: user.avatar
            };
            
            // Guardar en localStorage
            localStorage.setItem('beisjoven_session', JSON.stringify(this.currentUser));
            
            return { success: true, user: this.currentUser };
        }

        return { success: false, error: 'Email o contraseña incorrectos' };
    },

    // Cerrar sesión
    logout: function() {
        this.currentUser = null;
        localStorage.removeItem('beisjoven_session');
    },

    // Verificar si está logueado
    isLoggedIn: function() {
        return this.currentUser !== null;
    },

    // Verificar si es admin
    isAdmin: function() {
        return this.currentUser && this.currentUser.role === 'admin';
    },

    // Verificar si puede editar (admin o editor)
    canEdit: function() {
        return this.currentUser && ['admin', 'editor'].includes(this.currentUser.role);
    },

    // Obtener usuario actual
    getUser: function() {
        return this.currentUser;
    }
};

// Inicializar al cargar
Auth.init();

// Exportar
if (typeof window !== 'undefined') {
    window.Auth = Auth;
}
