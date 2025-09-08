// src/screens/AuthScreen.tsx
// Écran d'authentification unique avec bascule Login/Register
// - Style: React Native StyleSheet (pas de Tailwind)
// - Requêtes: fetch() minimal (modifiable vers axios plus tard)
// - Remplace DEFAULT_API_URL par l'IP locale de ton PC accessible depuis ton téléphone

/***
 * useState, useCallback: hooks React pour l'état local et les fonctions mémorisées.
 * View, Text, TextInput, etc : composants natifs RN.
 * keyboardAvoidingview, platform : pour éviter que le clavier recouvre les inputs.
 * ScrollView : permet de scroller si l'écran est petit.
 */
import React, { useState, useCallback, useRef } from 'react';
import {
ActivityIndicator,
View,
Text,
TextInput,
StyleSheet,
TouchableOpacity,
Alert,
KeyboardAvoidingView,
Platform,
Pressable,
SafeAreaView,
ScrollView,
} from 'react-native';
// import { env } from "expo-env";
import { api } from '../../api/api'; // adapte le chemin selon ton projet



//Types de réponse API (à adapter à ton backend si besoin)
/***
 * AuthResponse : forme attendue de la réponse serveur (tokens + user); Adapte si ton backend renvoie d'autres champs.
 * Props : propriétés du composant (un callback onAuthSuccess et apiBaseUrl pour l'URL de ton API).
 */
type AuthResponse = {
	accessToken: string;    // -> il doit y avoir une clé accessToken avec une valeur string(text).
	refreshToken: string;   // -> pareil pour le refresh. 
	user?: any;             // -> clé optionne (?) -> peut exister ou non. Type any = n'importe quoi (on pourra le préciser plus tard. ex: {id: number, name: string}).
	message?: string;       // -> message d'erreur éventuel. Là aussi optionnel.
};                          // exemple concret : {"accessToken": "abcde123", "refreshToken": "efgh456", "user":{"id": 1, "name": "pol"}} - - - réponse API en cas d'échec : {"message": "Mot de passe incorrect"}.

type Props = {
	//callback optionnelle à appeler en cas de succés (ex: enregistrer les tokens, naviguer)
	onAuthSuccess?: (payload: AuthResponse) => void;
	
	//C'est une fonction optionne (le ?). ELle est fourni, elle prend en entrée un payload de type AuthResponse
	//El ne retourne rien => void
	//En pratique, ca sert à transmettre les tokens au parents (ex: stocker en mémoire et naviguer vers une autre page)
	apiBaseUrl?: string;
	//Permet de surcharger l'URL de base au besoin
	//c'est une chaîne optionnelle.
	//Si on ne passe rien, AuthScreen utilise DEFAULT_API_URL.
	//Si on veux tester une autre API (rx. serveur de prod,) tu peux passer une autre URL.
};

// const DEFAULT_API_URL = env.API_BASE_URL;

export default function AuthScreen({ onAuthSuccess}: Props){
	// Étatd du formulaire
	const [isLogin, setIsLogin] = useState(true); // true = mode connexion, false = mode création
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	

	// REFS pour navigation clavier
	const emailRef = useRef<TextInput>(null);
	const passwordRef = useRef<TextInput>(null);
	const confirmRef = useRef<TextInput>(null);


	// Validation simple
	//Un email valide (isEmailValid(email) doit être true).
	//Un mot de passe d’au moins 6 caractères (password.length >= 6).
	//---
	//Un nom non vide (name.trim().length > 0).
	//.trim() = enlève les espaces au début et à la fin (donc " " devient "").
	//Donc ça empêche qu’un utilisateur entre juste des espaces.
	//Un email valide (isEmailValid(email)).
	//Un mot de passe d’au moins 6 caractères.
	//Le mot de passe et la confirmation doivent être identiques (password === confirm).
	const isEmailValid = (e: string) => /\S+@\S+\.\S+/.test(e);
	const canSubmit = isLogin
		? isEmailValid(email) && password.length >= 6 : 
		name.trim().length > 0 && 
		isEmailValid(email) && 
		password.length >= 6 && 
		password === confirm; 

	// Bascule Login/Register. Bouton/lien qui bascule entre les deux modes.
	// Déclaration d'une constante qui contient une fonction qui sera appelée lorsque l'utilisateur clique sur "créer un compte" ou "se connecter".
	// useCallback est un hook. Il mémorise une fonction pour qu'elle ne soit pas recréée à chaque rendu du composant.
	// ici, comme le tableau "  []  " est vide, cela veut dire que la fonction ne sera appelée qu'une seul fois.
	/*
		* setIslogin(prev => !prev);
		* isLogin est un state qui vaut:
			true en mode connexion
			false en mode inscription
		* setIsLogin permet de changer de valeur.
		* La syntaxe prev => !prev veut dire:
			.prend la valeur précédente (prev)
			.inverse-la (!prev)
			.si c'était true -> ca devient false
			.si c'etait false -> ca devient true
		-> Donc on bascule entre Login et Register
	
		Lorsque l'on change de mode, on doit supprimer les messages d'erreurs qui sont affichés.
		(ex: adresse email incorrecte, mot de passe invalide,...)
			. si on reste avec l'erreur visible, ca fera bzarre pour l'utilisateur.
			. Donc à chaque bascule, on remet l'erreur à vide.
	*/
	const switchMode = useCallback(() => {
		setIsLogin(prev => !prev);
		setError(null);
	}, []);

	// Soumission
	/**
	 * useCallback(async () => {...}, [...])
	 *  * useCallback : mémorise la fonction pour ne pas qu'elle soit recréée à chaque rendu du composant (optimisation).
	 *  * async () => {...} : la fonction est asynchrone, car on va attendre (await) la réponse du serveur.
	 *  * [isLogin, email, pawword, name, confirm, apiBaseUrl, onAuthSuccess] : ce sont les dépendances -> si une de ces valeurs change, React recrée la fonction (pour avoir la bonne version).
	 * 
	 * 
	 * setLoading(true)
	 *  * Active un état "chargement en cours"
	 *  * Sert à désactiver le bouton et afficher "Patiente..." au lieu de " se connecter ".
	 * 
	 * 
	 * setError(null);
	 *  * Efface les anciens messages d'erreur avant une nouvelle tentative.
	 * 
	 * 
	 * const path = isLogin ? '/auth/login' : 'auth/register';
	 *  * Choisit l'URL du backend en fonction du mode:
	 *      * Si isLogin = true -> path = 'auth/login'
	 *      * sinon -> path = 'auth/register'
	 * 
	 * const body = ...
	 *  * Crée le contenu (JSON) qui sera envoyé au serveur:
	 *      * si connexion -> {email, password}
	 *      * si inscription -> {name, email, password}
	 *  * name.trim() -> supprime les espaces au début/fin pour éviter un nom comme " "
	 * 
	 * 
	 * const res = await fetch(`${apiBaseUrl}${path}`, {
	 *      method: 'POST',
	 *      header: {'Content-Type': 'application/json'},
	 *      body: JSON.stringify(body),
	 *  });
	 *  * ${apiBaseUrl}${path} : construit l'URL complète en rapport avec les state/hook précédent.
	 *  * method: 'POST' : envoie des données (connexion/inscription).
	 *  * headers: dit au serveur que le corps est du JSON.
	 *  * body: JSON.stringify(body) : convertit l'objet {email, password} en txt JSON.
	 * 
	 * 
	 * cont data: AuthResponse = await res.json();
	 *  * Transforer la réponse JSON en objet javascript
	 *  * On précise son type (AuthResponse) -> ca contient accessToken, refreshToken, user et message.
	 * 
	 *
	 * if(!res.ok){
	 *  const msg = (data && (data.message as string)) || 'Une erreur est survenue';
	 *  setError(msg);
	 *  return;
	 * }
	 *  * res.ok est true si le serveur a répondu avec un code 220(succès).
	 *  * Si c'est un faux -> on récupère data.message ou on affiche un message par défaut.
	 *  * setError(msg) -> ca mettre le message d'erreur à l'écran
	 *  * return -> on arrête la fonction.
	 * 
	 * 
	 * onAuthSucces?.(data);
	 *  Alert.alert('Succès', isLogin ? 'Connexion Réussi' : 'Compte créé !');
	 *  setPassword('');
	 *  setConfirm('');
	 *      *onAuthSuccess?.data : si le prop onAuthSuccès a été fournie par le parent -> on l'appelle avec les données du serveur (par ex. pour enreistrer les tokens ou rediriger vers la page principale).
	 *      *Alert.alert(...) : affiche une boîte de dialogue avec "Succès".
	 *      *setPassword('') et setConfirm('') : on vide les champs sensibles(par sécurité).
	 * 
	 * 
	 * } catch(e: any){
	 *      setError(e?message ?? 'Impossible de contacter le server.);
	 * }
	 *      * si la requête échoue (par ex: serveur éteint, pas de wifi,...)On arrive ici.
	 *      * On affiche une erreur claire à l'utilisateur.
	 * 
	 * 
	 *  finally( setLoading(flase);}
	 *      *Qu'il y ait succès ou erreur -> on remet loading à false pour réactiver le bouton.
	*/
	const handleSubmit = useCallback(async () => {
		try {
			setLoading(true);       // Active le spinner / l'état de chargement
			setError(null);         // Réinitialise les erreurs avant la soumission
	
			// Prépare le corps de la requête
			const body = isLogin
				? { email, password }                     // Si login : on envoie email + password
				: { name: name.trim(), email, password }; // Sinon : nom + email + password
	
			// Envoi de la requête via Axios
			const { data } = await api.post<AuthResponse>(
				isLogin ? '/auth/login' : '/auth/register', 
				body
			);
	
			// Vérifie si le backend a renvoyé une erreur
			if (!data || data.message) {
				setError(data?.message || 'Une erreur est survenue.');
				return;
			}
	
			// Si tout va bien : callback et message de succès
			onAuthSuccess?.(data);
			Alert.alert("Succès", isLogin ? "Connexion réussie" : "Compte créé !");
			
			// Reset des champs de mot de passe
			setPassword("");
			setConfirm("");
		} catch (e: any) {
			// Gestion des erreurs réseau ou serveur
			setError(e?.message ?? "Impossible de contacter le serveur.");
		} finally {
			setLoading(false);  // Désactive le spinner dans tous les cas
		}
	}, [isLogin, email, password, name, confirm, onAuthSuccess]);

	/**
	 * Le return(...) construit l'interface utilisateur de l'écran d'authentification. Il décrit une hiérarchie de composant natifs qui:
	 *      1. Gèrent le clavier (KeyboardAvoidingView, ScrollView),
	 *      2. affichent des champs (textInput) et labels (text)
	 *      3. contrôlent l'interaction (TouchableOpacity)
	 *      4. affichent des messages(errer/succès),
	 *      5. permettent de basculer Login <--> Register
	 * 
	 * <keyboardAvoidingView style={{flex:1}} behavior={plateform.OS === 'ios' ? 'padding': undefined}
	 *  ...
	 * </keyboardAvoidView>
	 *      * Empêche que le clavier recouvre le champs quand il s'ouvre.
	 *      * Sur l'IOS, il applique un comportement spécifique (padding/position/height) pour déplacer l'UI.
	 *      * Sur Android, le comportement natif dépend plutôt du windowSoftInputMode(voir plus bas).
	 * 
	 *          Pièges et conseils:
	 *              *KeyboardAvoidingView ne fonctionne pas parfaitemtn si les enfants sont en position 'absolute'.
	 *              *Pour iphone avec notch, combine avec SafeAreaView (ou react-native-safe-area-context) afin d'éviter la zone de statut.
	 *              *Si tu utilises beaucoup d'inputs et que le clavier cache certains, associe KeyboardAvoidingView + ScrollView + refs sur inputs pour focus automatique.
	 * 
	 * 
	 * <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
	 *  ...
	 * </ScrollView>
	 *      * Permet au contenu de défiler si la hauteur dépasse l'écran. Important sur petits écrans ou quand le clavier est ouvert.
	 *      
	 *      * style : applique au composant ScrollView lui-êê (wrapper externe)
	 *      * contentContainerStyle: applique au contenu interne (équivalent d'un View qui wrappe tout les enfants). Pour centrer verticalement du contenu, ont met flexGrow: 1 dans contentContainerStyle.
	 *      
	 *      * KeyboardShouldPersistTaps : contrôle si un tap sur un enfant est passé quand le clavier est ouvert.
	 *          * 'never' (par défaut) : le premier tap ferme le clavier mais n'envoie pas l'événement au bouton.
	 *          * 'always' : le tap est envoyé au bouton même si le clavier est ouvert (mais le clavier restera ouvert).
	 *          * 'handled' : si l'enfant gère le touch ( a un onPress), le tap est pass; sinon tap ferme le clavier. C'est généralement la meilleur option pour éviter de bloquer les actions.
	 * 
	 *     * KeyboardDismissMode (autre prop utile) : 'none' | 'on-drag' | 'interactive' -- sur IOS on-drag ferme le clavier quand tu scrolles.
	 * 
	 * Pour un petit formulaire, ScrollView est ok. Pour de longues listes, utilises FlatList pour la performance.
	 * Si tu veux centrer verticalement même si le contenu est petit, dans contentContainerStylle mets flexGrow: 1 et justifyContent: 'center'.
	 * 
	 * 
	 * <Text style={styles.title}>{isLogi? 'Se connecter' : 'Créer un compte'}</Text>
	 * <Text style={styles.subtitle}>
	 *      {isLogin ? 'Ravie de te revoir' : 'Bienvenue ! Crée ton compte pour commencer'}
	 * </Text>
	 *      * <Text> : composant natif pour afficher du text. Contrairement au web, le rendu textuel en RN doit être via <Text>
	 *      * {isLogin ? 'Se connecter' : 'Créer un compte'} : opérateur ternaire Javascript.
	 *          Si isLogin vaut true, on affiche le premier text, sinon le second.
	 *      * style (styles.title) contrôlent fontSize, fontWeight, textAlign, marginBotton,...
	 * 
	 *      * Les composants <Text> peuvent contenir d'autres <Text> imbriqués pour applicquer des styles différents (span-like)
	 *      * textAlign centre le texte à l'intérieure du composant Text.
	 * 
	 * 
	 * 
	 * {isLogin && (
	 *  <View style={styles.field}>
	 *      <text style={styles.label}>Nom</Text>
	 *      <TextInput .../>
	 *  </View>
	 * )}
	 *      * C'est du render short-circuiting : si !isLogin est false (on est en login), l'expression entière est false et rien n'est rendu; si vrai, le JSX entre parenthse est rendu.
	 *      * Alternative: isLogin ? null : <View>...</Vieuw> -- même résultat.
	 * 
	 *  TextInput
	 *      * placeholder="ton nom" : text d'aide affiché quand le champ est vide.
	 *      * value={name} : champ contrôlé - la valeur affiché provient du state name.
	 *      * onChangeText={setName} : quand l'utilisateur tape, RN appelle cette fonction avec la nouvelle string -> setName met à jours le state -> le composant se rerend.
	 *      * autoCapitalize="words" : auto-majuscule la première lettre de chaque mot (utile pour les noms).
	 *      * returnKeyTypes="next" : change la touche du clavier (suivant/termine); aide UX.
	 *     
	 *  Pour enchaîner automatiquement sur le champs suivant, utilise des "refs" et "onSubmitEditing".
	 * 
	 * 
	 * 
	 * 
	 * */
	/*return(
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
		textAlign: 'center', //Définit comment les enfants sont alignés horizontalement (dans l'axe seconaire)
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
		flexDirection: 'row',     // Définit la direction principale dans laquelle les enfants sont placés.(col, row)
		justifyContent: 'center', // Définit comment les enfants sont distribués dans l'axe principal. (flex-start, center, flex-end, space-between, space-around)
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
*/
return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* TITRES */}
          <Text style={styles.title} accessibilityRole="header">
            {isLogin ? "Se connecter" : "Créer un compte"}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin
              ? "Ravi de te revoir 👋"
              : "Bienvenue ! Crée ton compte pour commencer."}
          </Text>

          {/* NOM (seulement en mode Register) */}
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
                onSubmitEditing={() => emailRef.current?.focus()}
                accessibilityLabel="Champ nom"
              />
            </View>
          )}

          {/* EMAIL */}
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              ref={emailRef}
              placeholder="exemple@gmail.com"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              accessibilityLabel="Champ email"
            />
          </View>

          {/* PASSWORD */}
          <View style={styles.field}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              ref={passwordRef}
              placeholder="********"
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              secureTextEntry
              returnKeyType={isLogin ? "done" : "next"}
              onSubmitEditing={() =>
                isLogin ? handleSubmit() : confirmRef.current?.focus()
              }
              accessibilityLabel="Champ mot de passe"
            />
          </View>

          {/* CONFIRM PASSWORD */}
          {!isLogin && (
            <View style={styles.field}>
              <Text style={styles.label}>Confirmer le mot de passe</Text>
              <TextInput
                ref={confirmRef}
                placeholder="********"
                value={confirm}
                onChangeText={setConfirm}
                style={styles.input}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                accessibilityLabel="Champ confirmation mot de passe"
              />
            </View>
          )}

          {/* ERREUR */}
          {error && (
            <Text
              style={styles.error}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              {error}
            </Text>
          )}

          {/* SUBMIT BUTTON */}
          <Pressable
            style={[
              styles.button,
              !canSubmit || loading ? styles.buttonDisabled : null,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
            accessibilityRole="button"
            accessibilityHint={
              isLogin
                ? "Valider pour se connecter"
                : "Valider pour créer un compte"
            }
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? "Se connecter" : "Créer un compte"}
              </Text>
            )}
          </Pressable>

          {/* PASSWORD RESET */}
          {isLogin && (
            <Pressable
              onPress={() =>
                Alert.alert("Mot de passe", "TODO: lien vers réinitialisation")
              }
              accessibilityRole="link"
            >
              <Text style={styles.link}>Mot de passe oublié ?</Text>
            </Pressable>
          )}

          {/* SWITCH LOGIN/REGISTER */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {isLogin ? "Pas encore de compte ?" : "Déjà inscrit ?"}
            </Text>
            <Pressable onPress={switchMode} accessibilityRole="button">
              <Text style={styles.switchLink}>
                {isLogin ? "Créer un compte" : "Se connecter"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
    justifyContent: "center",
  },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 20, textAlign: "center" },
  field: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  error: { color: "red", marginBottom: 15, textAlign: "center" },
  button: {
    backgroundColor: "#007bff",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 10,
  },
  buttonDisabled: { backgroundColor: "#aaa" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { color: "#007bff", marginTop: 10, textAlign: "center" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  switchText: { marginRight: 5 },
  switchLink: { color: "#007bff", fontWeight: "600" },
});