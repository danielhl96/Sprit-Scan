# Typescript Grundlagen


## Mapping-Array:
fileds: {label: string, key: keyof Entry} []= [
];

Kurze Version:
interface Entry {
    label: string;
    key: keyof HistoryEnrtry
    }

    fields: Entry [] = []

## Object:
const object = {
    name: "ABC",
    preis: 22,
};   

## Schlüssel-Wert-Paare (Record)
const lagerbestand: Record<string, number> = {
  'Espresso': 50,
  'Filterkaffee': 120,
  'Tee': 30
};

## Funktionen
function addiere(a: number, b: number): number {
  return a + b;
}
## Union Types
// Darf NUR einen dieser drei exakten Texte annehmen (Literal Type):
let status: 'offen' | 'in_arbeit' | 'erledigt' = 'offen';
status = 'erledigt'; // OK
// status = 'fertig'; // FEHLER! Editor warnt sofort.


## Interface vs Type
// Interface (klassisch für Objekte & Datenmodelle):
export interface User {
  id: number;
  name: string;
}

// Type (flexibler, z. B. für Union Types oder Kombinationen):
export type UserRole = 'admin' | 'gast';

## Utility Types
// Alle Felder aus HistoryEntry sind jetzt optional:
const entwurf: Partial<HistoryEntry> = { name: 'Neuer Eintrag' };

// Hat nur noch 'id' und 'name':
type KurzEintrag = Pick<HistoryEntry, 'id' | 'name'>;

## Asynchron
// Rückgabetyp ist immer Promise<Datentyp>
async function ladeEintrag(id: number): Promise<HistoryEntry> {
  // 1. Anfrage an Server senden und auf Antwort warten
  const response = await fetch(`https://beispiel.de{id}`);
  
  // 2. Antwort in JSON umwandeln und wieder warten
  const daten: HistoryEntry = await response.json();
  
  return daten;
}


