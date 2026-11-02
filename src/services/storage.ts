import { ProjectData } from '../types/canvas';

const DB_NAME = 'QuadroStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'projects';
const LOCALSTORAGE_BACKUP_KEY = 'quadrostudio_projects_fallback';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Fallback helpers for LocalStorage
function getLocalStorageProjects(): ProjectData[] {
  try {
    const raw = localStorage.getItem(LOCALSTORAGE_BACKUP_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('LocalStorage read error:', err);
    return [];
  }
}

function saveLocalStorageProjects(projects: ProjectData[]) {
  try {
    localStorage.setItem(LOCALSTORAGE_BACKUP_KEY, JSON.stringify(projects));
  } catch (err) {
    console.warn('LocalStorage save error:', err);
  }
}

export async function saveProject(project: ProjectData): Promise<void> {
  project.updatedAt = Date.now();
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(project);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Using LocalStorage fallback for saving project', err);
    const projects = getLocalStorageProjects();
    const index = projects.findIndex((p) => p.id === project.id);
    if (index >= 0) {
      projects[index] = project;
    } else {
      projects.push(project);
    }
    saveLocalStorageProjects(projects);
  }
}

export async function getProject(id: string): Promise<ProjectData | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Using LocalStorage fallback for getting project', err);
    const projects = getLocalStorageProjects();
    return projects.find((p) => p.id === id) || null;
  }
}

export async function getAllProjects(): Promise<ProjectData[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const sorted = (req.result as ProjectData[]).sort(
          (a, b) => b.updatedAt - a.updatedAt
        );
        resolve(sorted);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Using LocalStorage fallback for all projects', err);
    const projects = getLocalStorageProjects();
    return projects.sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

export async function deleteProject(id: string): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Using LocalStorage fallback for deleting project', err);
    const projects = getLocalStorageProjects().filter((p) => p.id !== id);
    saveLocalStorageProjects(projects);
    return true;
  }
}

export async function duplicateProject(id: string): Promise<ProjectData | null> {
  const original = await getProject(id);
  if (!original) return null;

  const duplicated: ProjectData = {
    ...JSON.parse(JSON.stringify(original)),
    id: 'proj_' + Math.random().toString(36).substring(2, 9),
    name: `${original.name} (Cópia)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await saveProject(duplicated);
  return duplicated;
}
