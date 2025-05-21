import * as firebase from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyAPh2NxsqvX5p5UB9dm__c-pQ92VRS0wUg",
    authDomain: "combat-tracker-905a6.firebaseapp.com",
    projectId: "combat-tracker-905a6",
    storageBucket: "combat-tracker-905a6.firebasestorage.app",
    messagingSenderId: "554351000833",
    appId: "1:554351000833:web:08f61a3a48333aecb1af00",
};

const app = firebase.initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
