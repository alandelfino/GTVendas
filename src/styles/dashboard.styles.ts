import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    welcomeText: {
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    userName: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    profileBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    levelsGrid: {
        gap: 8,
        marginTop: 10,
    },
    emptyContainer: {
        padding: 60,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1,
    },
    fixedBottomNav: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        paddingBottom: 20,
    },
    navInner: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 70,
        marginHorizontal: 20,
        borderRadius: 35,
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    navButtonItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    navButtonLabel: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 4,
    },
    activeNavIndicator: {
        position: 'absolute',
        top: -8,
        width: 4,
        height: 4,
        borderRadius: 2,
    }
});
