// src/services/firebase.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
} from "firebase/firestore";
import rawFirebaseConfig from "../../firebase-applet-config.json";

// Configuración unificada compatible tanto con firebase-applet-config.json como con variables de entorno de Vercel/Vite
export const firebaseConfig = {
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || rawFirebaseConfig.projectId,
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || rawFirebaseConfig.appId,
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || rawFirebaseConfig.apiKey,
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || rawFirebaseConfig.authDomain,
  firestoreDatabaseId: import.meta.env?.VITE_FIREBASE_FIRESTORE_DATABASE_ID || rawFirebaseConfig.firestoreDatabaseId,
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || rawFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || rawFirebaseConfig.messagingSenderId,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const db = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId.trim() !== "" && firebaseConfig.firestoreDatabaseId !== "(default)")
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const OperationType = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  LIST: "list",
  GET: "get",
  WRITE: "write",
};

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  return errInfo;
}

// Verificación obligatoria de conexión inicial según especificación
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("the client is offline")
    ) {
      console.warn("Verificá la configuración de conexión de Firebase.");
    }
  }
}
testConnection();

/**
 * Almacena el perfil único del usuario en la colección Firestore `users/{userId}`
 * incluyendo URL de banner, teléfonos de WhatsApp y configuraciones del negocio.
 */
export async function saveUserProfileToFirestore(userId, profileData) {
  if (!userId) return { ok: false, error: "ID de usuario requerido" };

  try {
    const isSuper = profileData.role === "superadmin" || profileData.email === "mecanicadakar@gmail.com";
    const defaultBanner = isSuper ? "/Flyers-MenuPY.png" : "/banner.jpg";
    const userRef = doc(db, "users", userId);
    const payload = {
      uid: userId,
      email: profileData.email || "",
      displayName: profileData.displayName || "",
      photoURL: profileData.photoURL || "",
      role: isSuper ? "superadmin" : (profileData.role || "pending_license"),
      businessName: profileData.name || profileData.businessName || (isSuper ? "MenuPY - Portal Administrador" : "Mi Negocio"),
      slogan: profileData.slogan || (isSuper ? "Llevá tu negocio al siguiente nivel - Menús digitales" : "Pedí online - Calidad y sabor"),
      bannerImage: profileData.bannerImage || defaultBanner,
      phoneIntl: profileData.phoneIntl || "",
      phoneDisplay: profileData.phoneDisplay || "",
      address: profileData.address || "Encarnación, Paraguay",
      deliveryNote: profileData.deliveryNote || "El costo de envío se coordina según la zona",
      storeId: profileData.storeId || (isSuper ? "admin" : userId),
      licenseCode: profileData.licenseCode || (isSuper ? "CAS-ADMIN-MASTER" : null),
      licensePlan: profileData.licensePlan || (isSuper ? "Plan Maestro" : null),
      licenseStatus: profileData.licenseStatus || (isSuper ? "activado" : "sin_licencia"),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(userRef, payload, { merge: true });

    // Si tiene storeId, también actualizar en colección `stores/{storeId}`
    if (payload.storeId) {
      try {
        const storeRef = doc(db, "stores", payload.storeId);
        await setDoc(
          storeRef,
          {
            id: payload.storeId,
            name: payload.businessName,
            slogan: payload.slogan,
            bannerImage: payload.bannerImage,
            phoneIntl: payload.phoneIntl,
            phoneDisplay: payload.phoneDisplay,
            address: payload.address,
            deliveryNote: payload.deliveryNote,
            ownerEmail: payload.email,
            ownerUid: userId,
            status: "activo",
            updatedAt: payload.updatedAt,
          },
          { merge: true }
        );
      } catch (storeErr) {
        console.warn("No se pudo sincronizar en colección stores:", storeErr);
      }
    }

    return { ok: true, profile: payload };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
    return { ok: false, error: err.message };
  }
}

/**
 * Recupera los datos únicos del perfil de usuario y configuraciones de negocio desde Firestore `users/{userId}`
 */
export async function getUserProfileFromFirestore(userId) {
  if (!userId) return null;

  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${userId}`);
  }
  return null;
}

/**
 * Recupera la configuración de una tienda desde Firestore `stores/{storeId}`
 */
export async function getStoreProfileFromFirestore(storeId) {
  if (!storeId) return null;

  try {
    const storeRef = doc(db, "stores", storeId);
    const snap = await getDoc(storeRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `stores/${storeId}`);
  }
  return null;
}

/**
 * Guarda o actualiza la configuración de una tienda en Firestore `stores/{storeId}`
 */
export async function saveStoreToFirestore(storeId, storeData) {
  if (!storeId) return null;

  try {
    const storeRef = doc(db, "stores", storeId);
    const payload = {
      id: storeId,
      name: storeData.name || storeData.businessName || "Menu Py",
      slogan: storeData.slogan || "Pedí online - Tu Carta Digital y Pedidos por WhatsApp",
      bannerImage: storeData.bannerImage || "/Flyers-MenuPY.png",
      phoneIntl: storeData.phoneIntl || "",
      phoneDisplay: storeData.phoneDisplay || "",
      address: storeData.address || "Encarnación, Paraguay",
      deliveryNote: storeData.deliveryNote || "El costo de envío se coordina según la zona",
      status: "activo",
      updatedAt: new Date().toISOString(),
    };
    if (Array.isArray(storeData.menu)) {
      payload.menu = storeData.menu;
    }
    await setDoc(storeRef, payload, { merge: true });
    return { ok: true, data: payload };
  } catch (err) {
    console.warn("Aviso Firestore al guardar store:", err);
    return { ok: false, error: err.message };
  }
}

/**
 * Iniciar sesión con cuenta de Google usando ventana emergente oficial
 * y recuperar/inicializar automáticamente el perfil único del usuario en Firestore
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Recuperar perfil previo si existe en Firestore (de forma segura con tolerancia a fallas)
    let existingProfile = null;
    try {
      existingProfile = await getUserProfileFromFirestore(user.uid);
    } catch (profErr) {
      console.warn("Aviso al consultar perfil en Firestore:", profErr);
    }

    // Si no existe, inicializar con datos de Google
    if (!existingProfile) {
      const isSuper = user.email === "mecanicadakar@gmail.com";
      const defaultBanner = isSuper ? "/Flyers-MenuPY.png" : "/banner.jpg";
      const initialProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split("@")[0] || "Usuario Google",
        photoURL: user.photoURL || "",
        role: isSuper ? "superadmin" : "pending_license",
        businessName: isSuper ? "MenuPY - Portal Administrador" : `Comercio de ${user.displayName || "Usuario"}`,
        slogan: isSuper ? "Llevá tu negocio al siguiente nivel - Menús digitales" : "Pedí online - Calidad y sabor",
        bannerImage: defaultBanner,
        phoneIntl: "",
        phoneDisplay: "",
        address: "Encarnación, Paraguay",
        deliveryNote: "El costo de envío se coordina según la zona",
        storeId: isSuper ? "admin" : user.uid,
        licenseCode: isSuper ? "CAS-ADMIN-MASTER" : null,
        licensePlan: isSuper ? "Plan Maestro" : null,
        licenseStatus: isSuper ? "activado" : "sin_licencia",
      };
      try {
        await saveUserProfileToFirestore(user.uid, initialProfile);
      } catch (saveErr) {
        console.warn("Aviso al guardar perfil inicial en Firestore:", saveErr);
      }
      existingProfile = initialProfile;
    } else {
      // Actualizar último acceso
      try {
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, { lastLoginAt: new Date().toISOString() }, { merge: true });
      } catch {}
    }

    return {
      ok: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split("@")[0] || "Usuario Google",
        photoURL: user.photoURL || "",
        profile: existingProfile,
        getIdToken: (forceRefresh) => user.getIdToken(forceRefresh),
        getIdTokenResult: (forceRefresh) => user.getIdTokenResult(forceRefresh),
      },
      firebaseUser: user,
    };
  } catch (err) {
    console.error("Error al iniciar sesión con Google:", err);
    let message = "No se pudo completar el inicio de sesión con Google.";
    if (err.code === "auth/popup-closed-by-user") {
      message = "Se cerró la ventana de inicio de sesión de Google antes de finalizar.";
    } else if (err.code === "auth/popup-blocked") {
      message = "El navegador bloqueó la ventana emergente de Google. Habilitá las ventanas emergentes en tu navegador para continuar con Google, o ingresá con tu Usuario y PIN de seguridad.";
    } else if (err.code === "auth/cancelled-popup-request") {
      message = "Operación cancelada por otra solicitud en curso.";
    } else if (err.code === "auth/unauthorized-domain") {
      message = "Dominio no autorizado en Firebase Auth. Podés ingresar con tu Usuario y PIN de seguridad.";
    } else if (err.code === "auth/operation-not-allowed") {
      message = "El acceso con Google no está habilitado en Firebase. Podés ingresar con tu Usuario y PIN de seguridad.";
    } else if (err.code === "auth/network-request-failed") {
      message = "Error de red al conectar con Google. Verificá tu conexión a internet.";
    } else if (err.message) {
      message = `Aviso Google: ${err.message}`;
    }
    return { ok: false, error: message, code: err.code };
  }
}

/**
 * Cerrar sesión de Firebase Auth
 */
export async function logOutGoogleUser() {
  try {
    await signOut(auth);
    return { ok: true };
  } catch (err) {
    console.error("Error cerrando sesión de Google:", err);
    return { ok: false, error: err.message };
  }
}

/**
 * Suscribirse a cambios de estado de autenticación
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const profile = await getUserProfileFromFirestore(user.uid);
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split("@")[0] || "Usuario",
        photoURL: user.photoURL || "",
        profile,
      });
    } else {
      callback(null);
    }
  });
}
