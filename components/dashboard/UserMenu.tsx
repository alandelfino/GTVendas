import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
    styles 
}: UserMenuProps) => {
    // Alinhando com as cores exatas da página inicial
    const SHEET_BG = isDark ? '#1C252E' : '#FFFFFF';
    const SCREEN_BG = isDark ? '#1C252E' : '#F2F2F7';

    return (
        <Modal 
            visible={visible} 
            transparent={Platform.OS !== 'ios'}
            animationType="slide"
            presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
            // @ts-ignore - Propriedade nativa do iOS no RN > 0.72
            sheetAllowedDetents={Platform.OS === 'ios' ? ['medium'] : undefined}
            onRequestClose={onClose}
        >
            <View style={Platform.OS === 'ios' ? { flex: 1, backgroundColor: SCREEN_BG } : styles.iosModalOverlay}>
                
                <View style={[
                    styles.iosMenuSheet, 
                    { 
                        backgroundColor: SHEET_BG,
                        paddingBottom: Math.max(40, insets.bottom),
                        marginTop: Platform.OS === 'ios' ? 0 : 'auto', 
                        width: '100%',
                    }
                ]}>
                    <View style={{ 
                        width: 40, 
                        height: 5, 
                        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', 
                        borderRadius: 3, 
                        alignSelf: 'center', 
                        marginBottom: 15, 
                        marginTop: 10 
                    }} />
                    
                    <View style={styles.menuHeader}>
                        <View style={[styles.menuAvatarLarge, { backgroundColor: THEME.accent }]}>
                            <Text style={[styles.avatarLabelLarge, { color: '#FFFFFF' }]}>
                                {(user?.nomeCompleto || user?.username || 'U').charAt(0)}
                            </Text>
                        </View>
                        <Text style={[styles.menuName, { color: THEME.text }]}>{user?.nomeCompleto || user?.username}</Text>
                        <Text style={[styles.menuRole, { color: THEME.secondaryText }]}>{'Representante Comercial'}</Text>
                    </View>
                    
                    <View style={[styles.menuSeparator, { backgroundColor: THEME.separator }]} />
                    
                    <TouchableOpacity 
                        style={[styles.menuActionItem, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: THEME.separator }]} 
                        onPress={() => { onClose(); router.push('/profile'); }}
                    >
                        <Text style={[styles.logoutText, { color: THEME.text }]}>Ver Meu Perfil</Text>
                        <FontAwesome name="user-circle" size={18} color={THEME.accent} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuActionItem} onPress={handleLogout}>
                        <Text style={[styles.logoutText, { color: THEME.danger }]}>Sair da Conta</Text>
                        <FontAwesome name="sign-out" size={18} color={THEME.danger} />
                    </TouchableOpacity>

                    {Platform.OS !== 'ios' && (
                        <TouchableOpacity style={[styles.menuActionItem, { marginTop: 10 }]} onPress={onClose}>
                            <Text style={[styles.logoutText, { color: THEME.secondaryText }]}>Fechar</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {Platform.OS !== 'ios' && (
                    <TouchableOpacity 
                        style={[StyleSheet.absoluteFill, { zIndex: -1 }]} 
                        onPress={onClose} 
                    />
                )}
            </View>
        </Modal>
    );
};
