import * as firebase from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyAPh2NxsqvX5p5UB9dm__c-pQ92VRS0wUg",
    authDomain: "combat-tracker-905a6.firebaseapp.com",
    databaseURL:
        "https://combat-tracker-905a6-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "combat-tracker-905a6",
    storageBucket: "combat-tracker-905a6.firebasestorage.app",
    messagingSenderId: "554351000833",
    appId: "1:554351000833:web:08f61a3a48333aecb1af00",
};

const app = firebase.initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export default app;
