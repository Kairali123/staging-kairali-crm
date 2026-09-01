import crypto from 'crypto';

export function hash(s: string, salt: number | string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const hashed = crypto.createHash('sha256').update(s).digest('hex');
      resolve(hashed);
    } catch (e) {
      reject(e);
    }
  });
}

export function compare(s: string, hashed: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      const currentHashed = crypto.createHash('sha256').update(s).digest('hex');
      resolve(currentHashed === hashed);
    } catch (e) {
      reject(e);
    }
  });
}

const bcrypt = {
  hash,
  compare
};

export default bcrypt;
