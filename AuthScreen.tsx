import React, { useState, useCallback } from 'react';
import {
View,
Text,
TextInput,
StyleSheet,
TouchableOpacity,
Alert,
KeyboardAvoidingView,
Platform,
ScrollView,
} from 'react-native';


type AuthResponse = {
    accessToken: string;
    refreshToken: string;
    user?: any;
    message?: string;
};
type props = {
    onAuthSuccess?: (payload: AuthResponse) => void;
    apiBaseUrl?: string;
};


const DEFAULT_API_URL = 'http://0.0.0.0:3000';

export default function AuthScreen({ onAuthSuccess, apiBaseUrl = DEFAULT_API_URL}: props){

    const [isLogin, setIsLogin] = useState(true); 
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);


    const isEmailValid = (e: string) => /\S+@\S+\.\S+/.test(e);
    const canSubmit = isLogin
        ? isEmailValid(email) && password.length >= 6
        : name.trim().length > 0 && isEmailValid(email) && password.length >= 6 && password === confirm; 


    const switchMode = useCallback(() => {
        setIsLogin(prev => !prev);
        setError("");
    }, []);

    
    const handleSubmit = useCallback(async () => {
        try{
            setLoading(true);
            setError(null);

            const path = isLogin ? '/auth/login' : '/auth/register';
            const body = isLogin
                ? { email, password }
                : { name: name.trim(), email, password };

            const res = await fetch(`${apiBaseUrl}${path}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body),
            });

            const data: AuthResponse = await res.json();

            if(!res.ok){
                const msg = (data && (data.message as string)) || ' Une erreur est survenue.';
                setError(msg);
                return;
            } 

    
            onAuthSuccess?.(data);
            Alert.alert('Succès', isLogin ? 'Connexion Réussi' : 'Compte créé !');
            setPassword('');
            setConfirm('');
        } catch(e: any){
            setError(e?.message ?? 'Impossible de contacter le server.');
        } finally{
            setLoading(false);
        }
    }, [isLogin, email, password, name, confirm, apiBaseUrl, onAuthSuccess]);

    return(
        <KeyboardAvoidingView style={{ flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <Text style={styles.title}>{isLogin ? 'Se connecter' : 'Créer un compte'}</Text>
                <Text style={styles.subtitle}>
                    {isLogin ? 'Ravi de te revoir' : 'Bienvenue ! Crée ton compte pour commencer.'}
                </Text>

                {!isLogin && (
                        <View style={styles.field}>
                            <Text style={styles.label}>Nom</Text>
                            <TextInput
                                placeholder="Ton Nom"
                                value={name}
                                onChangeText={setName}
                                style={styles.input}
                                autoCapitalize="words"
                                returnKeyType="next"
                            />
                        </View>
                )}

                <View style={styles.field}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        placeholder="exemple@gmail.com"
                        value={email}
                        onChangeText={setEmail}
                        style={styles.input}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        returnKeyType="next"
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Mot de passe</Text>
                    <TextInput
                        placeholder="........"
                        value={password}
                        onChangeText={setPassword}
                        style={styles.input}
                        secureTextEntry
                        returnKeyType={isLogin ? 'done' : 'next'}
                    />
                </View>

                {!isLogin && (
                    <View style={styles.field}>
                        <Text style={styles.label}>Confirmer le mot de passe</Text>
                        <TextInput
                            placeholder="........"
                            value={confirm}
                            onChangeText={setConfirm}
                            style={styles.input}
                            secureTextEntry
                            returnKeyType="done"
                        />
                    </View>
                )}

                {error && <Text style={styles.error}>{error}</Text>}

                <TouchableOpacity
                    style={[styles.button, !canSubmit || loading ? styles.buttonDisabled : null]}
                    onPress={handleSubmit}
                    disabled={!canSubmit || loading}
                    activeOpacity={0.8}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Patiente...' : isLogin ? 'Se connecter' : "Créer un compte"}
                    </Text>
                </TouchableOpacity>

                {isLogin && (
                    <TouchableOpacity onPress={() => Alert.alert('Mot de passe', 'TODO: lien vers réinitialisation')}>
                        <Text style={styles.link}>Mot de passe oublié ?</Text>
                    </TouchableOpacity>
                )}

                <View style={styles.switchRow}>
                    <Text style={styles.switchText}>
                        {isLogin ? 'Pas encore de compte ?' : 'Déjà inscrit ?'}
                    </Text>
                    <TouchableOpacity onPress={switchMode}>
                        <Text style={styles.switchLink}>
                            {isLogin ? 'Créer un compte' : 'Se connecter'}
                        </Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    )

}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 24,
        paddingTop: 80,
        backgroundColor: '#FFFFFF',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 6,
        textAlign: 'center', 
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    field: {
        marginBottom: 14,
    },
    label: {
        fontSize: 14,
        marginBottom: 6,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#DDD',
        backgroundColor: ' #FAFAFA',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 12,
        fontSize: 16,
    },
    error: {
        color: '#B00020',
        marginBottom: 12,
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#1E88E5',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#FF',
        fontSize: 16,
        fontWeight: '700',
    },
    link: {
        marginTop: 12,
        textAlign: 'center',
        textDecorationLine: 'underline',
        fontSize: 14,
    },
    switchRow: {
        flexDirection: 'row',     
        justifyContent: 'center', 
        marginTop: 18,
    },
    switchText: {
        fontSize: 14,
        color: '#333',
    },
    switchLink: {
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 6,
        textDecorationLine: 'underline',
    }
});