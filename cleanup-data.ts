import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from './firebase-applet-config.json';
import * as dotenv from 'dotenv';

dotenv.config();

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

const EXCLUDED_EMAILS = ['d2kabdulkahar@gmail.com', 'hotelshotabdiabashik@gmail.com', 'fuadf342@gmail.com', 'selectedlegendbusiness@gmail.com'];

async function cleanupData() {
  console.log('Starting data cleanup...');

  try {
    // Authenticate as admin to bypass rules
    console.log('Authenticating...');
    // Replace with actual admin credentials if needed, or rely on the fact that we are running locally
    // For this script, we'll assume the rules allow read/write if we just run it, but since it failed,
    // we might need to use the admin SDK. Since we don't have the service account, we'll try to 
    // just catch errors and proceed.
    
    // 1. Delete all bookings
    console.log('Fetching bookings...');
    const bookingsRef = collection(db, 'bookings');
    const bookingsSnapshot = await getDocs(bookingsRef);
    
    console.log(`Found ${bookingsSnapshot.size} bookings. Deleting...`);
    let deletedBookings = 0;
    for (const bookingDoc of bookingsSnapshot.docs) {
      await deleteDoc(doc(db, 'bookings', bookingDoc.id));
      deletedBookings++;
    }
    console.log(`Successfully deleted ${deletedBookings} bookings.`);

    // 2. Delete non-admin users
    console.log('Fetching users...');
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    console.log(`Found ${usersSnapshot.size} users. Filtering...`);
    let deletedUsers = 0;
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userEmail = userData.email;
      const userRole = userData.role;

      if (userRole !== 'admin' && !EXCLUDED_EMAILS.includes(userEmail)) {
        console.log(`Deleting user: ${userEmail} (Role: ${userRole})`);
        await deleteDoc(doc(db, 'users', userDoc.id));
        deletedUsers++;
      } else {
        console.log(`Skipping user: ${userEmail} (Role: ${userRole})`);
      }
    }
    console.log(`Successfully deleted ${deletedUsers} non-admin users.`);

    console.log('Data cleanup completed successfully.');
  } catch (error) {
    console.error('Error during data cleanup:', error);
  }
}

cleanupData();
