import { FontAwesome, Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';

interface UserMenuProps {
    visible: boolean;
    onClose: () => void;
    isDark: boolean;
    insets: any;
    user: any;
    THEME: any;
    handleLogout: () => void;
    router: any;
    styles: any;
}

export const UserMenu = ({ 
    visible, 
    onClose, 
    isDark, 
    insets, 
    user, 
    THEME, 
    handleLogout, 
    router, 
    styles: oldStyles 
}: UserMenuProps) => {
    const MENU_BG = isDark ? '#1C252E' : '#FFFFFF';

    return (
        <Modal 
            visible={visible} 
            transparent={Platform.OS !== 'ios'}
            animationType="slide"
            presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: MENU_BG }]}>
                {/* Header Estilo Apple */}
                <View style={[styles.modalHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                    <View style={styles.modalHandle} />
                    <Text style={[styles.modalTitle, { color: THEME.text }]}>Minha Conta</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalClose}>
                        <Text style={{ color: THEME.accent, fontWeight: '700', fontSize: 17 }}>OK</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(40, insets.bottom) }]}>
                    {/* Perfil do Usuário */}
                    <View style={styles.profileSection}>
                        <View style={[styles.avatarLarge, { backgroundColor: THEME.accent }]}>
                            <Text style={styles.avatarLabelLarge}>
                                {(user?.nomeCompleto || user?.username || 'U').charAt(0)}
                            </Text>
                            <View style={styles.statusDot} />
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={[styles.userName, { color: THEME.text }]}>{user?.nomeCompleto || user?.username}</Text>
                            <Text style={[styles.userRole, { color: THEME.secondaryText }]}>Representante Comercial</Text>
                        </View>
                    </View>

                    <View style={styles.menuGroup}>
                        <Text style={[styles.groupLabel, { color: THEME.secondaryText }]}>GERENCIAMENTO</Text>
                        
                        <TouchableOpacity 
                            style={[styles.menuItem, { backgroundColor: THEME.card }]} 
                            onPress={() => { onClose(); router.push('/profile'); }}
                        >
                            <View style={[styles.iconBox, { backgroundColor: THEME.accent + '15' }]}>
                                <FontAwesome name="user-circle-o" size={18} color={THEME.accent} />
                            </View>
                            <Text style={[styles.menuItemText, { color: THEME.text }]}>Ver Meu Perfil</Text>
                            <Ionicons name="chevron-forward" size={16} color={THEME.secondaryText} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.menuItem, { backgroundColor: THEME.card }]} 
                            onPress={() => { onClose(); router.push('/metas-history'); }}
                        >
                            <View style={[styles.iconBox, { backgroundColor: '#32D74B' + '15' }]}>
                                <FontAwesome name="history" size={16} color="#32D74B" />
                            </View>
                            <Text style={[styles.menuItemText, { color: THEME.text }]}>Histórico de Metas</Text>
                            <Ionicons name="chevron-forward" size={16} color={THEME.secondaryText} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.menuGroup}>
                        <Text style={[styles.groupLabel, { color: THEME.secondaryText }]}>APLICATIVO</Text>
                        
                        <TouchableOpacity style={[styles.menuItem, { backgroundColor: THEME.card }]}>
                            <View style={[styles.iconBox, { backgroundColor: THEME.navText + '15' }]}>
                                <Ionicons name="settings-outline" size={18} color={THEME.navText} />
                            </View>
                            <Text style={[styles.menuItemText, { color: THEME.text }]}>Configurações</Text>
                            <Ionicons name="chevron-forward" size={16} color={THEME.secondaryText} />
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.menuItem, { backgroundColor: THEME.card }]} onPress={handleLogout}>
                            <View style={[styles.iconBox, { backgroundColor: THEME.danger + '15' }]}>
                                <Ionicons name="log-out-outline" size={18} color={THEME.danger} />
                            </View>
                            <Text style={[styles.menuItemText, { color: THEME.danger }]}>Sair da Conta</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    modalHeader: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1 },
    modalHandle: { position: 'absolute', top: 8, width: 36, height: 5, borderRadius: 2.5, backgroundColor: '#C7C7CC' },
    modalTitle: { fontSize: 16, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 10 },
    modalClose: { position: 'absolute', right: 16, marginTop: 10 },
    content: { padding: 20 },
    profileSection: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 32,
        marginTop: 10
    },
    avatarLarge: { 
        width: 70, 
        height: 70, 
        borderRadius: 35, 
        justifyContent: 'center', 
        alignItems: 'center', 
        position: 'relative'
    },
    avatarLabelLarge: { fontSize: 28, fontWeight: '800', color: '#FFF' },
    statusDot: { 
        width: 14, 
        height: 14, 
        borderRadius: 7, 
        backgroundColor: '#32D74B', 
        position: 'absolute', 
        bottom: 2, 
        right: 2,
        borderWidth: 2,
        borderColor: '#FFF'
    },
    profileInfo: { marginLeft: 16 },
    userName: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
    userRole: { fontSize: 13, fontWeight: '600', marginTop: 2, opacity: 0.8 },
    menuGroup: { marginBottom: 28 },
    groupLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 16, marginLeft: 4 },
    menuItem: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: 14, 
        borderRadius: 12, 
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1
    },
    iconBox: { 
        width: 36, 
        height: 36, 
        borderRadius: 10, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginRight: 14 
    },
    menuItemText: { flex: 1, fontSize: 15, fontWeight: '600' }
});

