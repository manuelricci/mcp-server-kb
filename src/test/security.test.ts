import {describe, it, expect, beforeAll} from "vitest";
import {validatePath} from "../lib/security.js";

beforeAll(() => {
    process.env.KB_ROOT_PATH = '/tmp/test-kb';
});

describe('validatePath', () => {
    it('should allow valid relative paths', () => {
        expect(() => validatePath('docs/readme.md')).not.toThrow();
        expect(() => validatePath('config/server.json')).not.toThrow();
        expect(() => validatePath('subdir/file.txt')).not.toThrow();
    });

    it('should return the resolved absolute path', () => {
        const result = validatePath('docs/readme.md');
        expect(result).toBe('/tmp/test-kb/docs/readme.md');
    })

    it('should allow paths with ../ that stay within KB', () => {
        const result = validatePath('docs/../config/server.json');
        expect(result).toBe('/tmp/test-kb/config/server.json');
    });

    it('should block Unix path traversal attacks', () => {
        const attacks = [
            '../../../../etc/passwd',
            '../../../etc/shadow',
            '../../.ssh/id_rsa',
            '../../../../root/.bashrc'
        ];
        attacks.forEach(attack => {
            expect(() => validatePath(attack)).toThrow('Access denied');
        })
    });

    it('should block Windows path traversal attacks', () => {
        const attacks = [
            '..\\..\\..\\Windows\\System32\\config\\sam',
            '..\\..\\..\\boot.ini',
            '..\\..\\Users\\Administrator\\Desktop\\passwords.txt'
        ];
        attacks.forEach(attack => {
            expect(() => validatePath(attack)).toThrow('Access denied');
        })
    });

    it('should block absolute paths outside KB', () => {
        expect(() => validatePath('/etc/passwd')).toThrow('Access denied');
        expect(() => validatePath('/var/log/syslog')).toThrow('Access denied');
        expect(() => validatePath('/root/.ssh/id_rsa')).toThrow('Access denied');
    });

    it('should block mixed . and .. attacks', () => {
        expect(() => validatePath('./docs/../../../../etc/passwd')).toThrow('Access denied');
    });

    it('should handle edge cases gracefully', () => {
        expect(() => validatePath('my docs/file name.txt')).not.toThrow();
        expect(() => validatePath('files/my-file_v2.txt')).not.toThrow();
        expect(() => validatePath('./docs/readme.md')).not.toThrow();
    })

})

describe('Regression: KB root prefix escape', () => {
    it('should block paths to sibling directories with similar names',  () => {
        /*
        BUG: startsWith(kbRoot) senza separatore finale matcha anche directory sorelle.
        '/tmp/test-kb-malicious'.startsWith('/tmp/test-kb') -> true!
        FIX: startsWith(kbRoot + sep) richiede lo slash:
        '/tmp/test-kb-malicious'.startsWith('/tmp/test-kb/') -> false!
        Se qualcuno rimuove il + sep da security.ts questo test fallisce immediatamente.
         */
        const siblingAttacks = [
            '../test-kb-malicious/evil.txt',
            '../test-kb-backup/secrets.env',
            '../test-kb2/config.json'
        ];

        siblingAttacks.forEach(attack => {
            expect(() => validatePath(attack), `Regression: "${attack}" non dovrebbe essere accessibile!`).toThrow('Access denied');
        });
    })
})