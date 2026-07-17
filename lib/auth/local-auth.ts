export type PublicUser = {
  id: string;
  name: string;
  email: string;
  isDemo?: boolean;
};

type StoredUser = PublicUser & {
  passwordHash: string;
  passwordSalt: string;
};

export type Registration = { name: string; email: string; password: string };

export interface AuthRepository {
  register(input: Registration): Promise<PublicUser>;
  login(email: string, password: string): Promise<PublicUser>;
  loginAsDemo(): Promise<PublicUser>;
  logout(): Promise<void>;
  getSessionUser(): Promise<PublicUser | null>;
  reset(): void;
}

const USERS_KEY = "sydaniskuri.users";
const SESSION_KEY = "sydaniskuri.session";
const ITERATIONS = 120_000;

function normalizeEmail(email: string) {
  return email.trim().toLocaleLowerCase("fi");
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: ITERATIONS },
    key,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

function publicUser(user: StoredUser): PublicUser {
  return { id: user.id, name: user.name, email: user.email, ...(user.isDemo ? { isDemo: true } : {}) };
}

export class LocalAuthRepository implements AuthRepository {
  constructor(private readonly storage: Storage) {}

  private readUsers(): StoredUser[] {
    const value = this.storage.getItem(USERS_KEY);
    if (!value) return [];
    try {
      const users: unknown = JSON.parse(value);
      if (!Array.isArray(users)) throw new Error();
      return users as StoredUser[];
    } catch {
      throw new Error("Paikalliset käyttäjätiedot ovat vioittuneet.");
    }
  }

  private writeUsers(users: StoredUser[]) {
    this.storage.setItem(USERS_KEY, JSON.stringify(users));
  }

  private setSession(userId: string) {
    this.storage.setItem(SESSION_KEY, JSON.stringify({ userId }));
  }

  async register(input: Registration): Promise<PublicUser> {
    const name = input.name.trim();
    const email = normalizeEmail(input.email);
    if (!name) throw new Error("Anna nimesi.");
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Anna kelvollinen sähköpostiosoite.");
    if (input.password.length < 8) throw new Error("Salasanassa tulee olla vähintään 8 merkkiä.");
    const users = this.readUsers();
    if (users.some((user) => user.email === email)) throw new Error("Sähköpostilla on jo tili.");

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const user: StoredUser = {
      id: crypto.randomUUID(),
      name,
      email,
      passwordSalt: bytesToBase64(salt),
      passwordHash: await hashPassword(input.password, salt),
    };
    this.writeUsers([...users, user]);
    this.setSession(user.id);
    return publicUser(user);
  }

  async login(emailInput: string, password: string): Promise<PublicUser> {
    const email = normalizeEmail(emailInput);
    const user = this.readUsers().find((candidate) => candidate.email === email && !candidate.isDemo);
    if (!user || (await hashPassword(password, base64ToBytes(user.passwordSalt))) !== user.passwordHash) {
      throw new Error("Sähköposti tai salasana on väärä.");
    }
    this.setSession(user.id);
    return publicUser(user);
  }

  async loginAsDemo(): Promise<PublicUser> {
    const users = this.readUsers();
    let demo = users.find((user) => user.isDemo);
    if (!demo) {
      demo = {
        id: crypto.randomUUID(),
        name: "Demokäyttäjä",
        email: "demo@sydaniskuri.local",
        isDemo: true,
        passwordSalt: "",
        passwordHash: "",
      };
      this.writeUsers([...users, demo]);
    }
    this.setSession(demo.id);
    return publicUser(demo);
  }

  async logout(): Promise<void> {
    this.storage.removeItem(SESSION_KEY);
  }

  async getSessionUser(): Promise<PublicUser | null> {
    const rawSession = this.storage.getItem(SESSION_KEY);
    if (!rawSession) return null;
    try {
      const session = JSON.parse(rawSession) as { userId?: string };
      const user = this.readUsers().find((candidate) => candidate.id === session.userId);
      return user ? publicUser(user) : null;
    } catch {
      throw new Error("Paikallinen istunto on vioittunut.");
    }
  }

  reset() {
    this.storage.removeItem(USERS_KEY);
    this.storage.removeItem(SESSION_KEY);
  }
}
