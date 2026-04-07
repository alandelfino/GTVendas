import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, Image, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface CelebrationModalProps {
    visible: boolean;
    onClose: () => void;
    level: 'Bronze' | 'Prata' | 'Ouro' | string;
    units: number;
    trophyIcon: any;
    isDark: boolean;
    THEME: any;
}

// Simples efeito de confete sem bibliotecas externas para manter a leveza
const ConfettiItem = ({ delay }: { delay: number }) => {
    const anim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const xOffset = useRef(Math.random() * width).current;
    const color = useRef(['#F9B252', '#32D74B', '#007AFF', '#FF453A', '#AF52DE'][Math.floor(Math.random() * 5)]).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(anim, {
                toValue: 1,
                duration: 2500 + Math.random() * 1000,
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 1000 + Math.random() * 1000,
                delay,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    const translateY = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [-50, height + 50],
    });

    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <Animated.View
            style={[
                styles.confetti,
                {
                    backgroundColor: color,
                    left: xOffset,
                    transform: [{ translateY }, { rotate }],
                    opacity: anim.interpolate({
                        inputRange: [0, 0.8, 1],
                        outputRange: [1, 1, 0],
                    }),
                },
            ]}
        />
    );
};

export const CelebrationModal = ({ visible, onClose, level, units, trophyIcon, isDark, THEME }: CelebrationModalProps) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            scaleAnim.setValue(0);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.container}>
                <BlurView intensity={isDark ? 40 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                
                {/* Partículas de Confete */}
                {Array.from({ length: 40 }).map((_, i) => (
                    <ConfettiItem key={i} delay={i * 100} />
                ))}

                <Animated.View style={[
                    styles.content, 
                    { 
                        opacity: opacityAnim,
                        transform: [{ scale: scaleAnim }]
                    }
                ]}>
                    <View style={styles.glowContainer}>
                        <View style={[styles.glow, { backgroundColor: THEME.accent }]} />
                        <Image source={trophyIcon} style={styles.trophyImage} resizeMode="contain" />
                    </View>

                    <Text style={[styles.congratsText, { color: THEME.text }]}>PARABÉNS!</Text>
                    <Text style={[styles.subtitle, { color: THEME.secondaryText }]}>Você atingiu o nível</Text>
                    <Text style={[styles.levelText, { color: THEME.accent }]}>{level.toUpperCase()}</Text>
                    
                    <View style={[styles.unitsBadge, { backgroundColor: THEME.navAction }]}>
                        <Text style={[styles.unitsText, { color: THEME.text }]}>{units.toLocaleString('pt-BR')} PEÇAS</Text>
                    </View>

                    <TouchableOpacity style={[styles.button, { backgroundColor: THEME.accent }]} onPress={onClose}>
                        <Text style={styles.buttonText}>CONTINUAR</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: width * 0.85,
        backgroundColor: 'transparent',
        alignItems: 'center',
        padding: 30,
    },
    glowContainer: {
        width: 220,
        height: 220,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    glow: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        opacity: 0.3,
        transform: [{ scale: 1.5 }],
    },
    trophyImage: {
        width: 180,
        height: 180,
    },
    congratsText: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '500',
    },
    levelText: {
        fontSize: 48,
        fontWeight: '900',
        marginBottom: 20,
    },
    unitsBadge: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        marginBottom: 40,
    },
    unitsText: {
        fontSize: 18,
        fontWeight: '700',
    },
    button: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 1,
    },
    confetti: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 2,
    }
});
