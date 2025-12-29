import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export const db = admin.firestore();

// usage example:
// const snapshot = await db
//   .collection("encrypted_employee_data")
//   .where("department", "==", "HR")
//   .limit(10)
//   .get();

// const results = snapshot.docs.map((doc) => doc.data());
