import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const peopleCol = () => collection(db, "people");
const drinksCol = () => collection(db, "drinks");
const logsCol = () => collection(db, "logs");

function snapToList(snap) {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function listenPeople(cb) {
  const q = query(peopleCol(), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => cb(snapToList(snap)));
}

export function listenDrinks(cb) {
  const q = query(drinksCol(), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => cb(snapToList(snap)));
}

export function listenLogs(cb) {
  const q = query(logsCol(), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => cb(snapToList(snap)));
}

export function addPerson(name) {
  return addDoc(peopleCol(), { name, createdAt: serverTimestamp() });
}

export function deletePerson(id) {
  return deleteDoc(doc(db, "people", id));
}

export function addDrink({ name, emoji, ml, abv }) {
  return addDoc(drinksCol(), {
    name,
    emoji: emoji || "🍹",
    ml,
    abv,
    createdAt: serverTimestamp(),
  });
}

export function deleteDrink(id) {
  return deleteDoc(doc(db, "drinks", id));
}

export function addLog(personId, drinkId) {
  return addDoc(logsCol(), {
    personId,
    drinkId,
    createdAt: serverTimestamp(),
  });
}

export function deleteLog(id) {
  return deleteDoc(doc(db, "logs", id));
}
