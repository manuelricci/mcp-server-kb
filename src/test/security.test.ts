import {describe, it, expect, beforeAll} from "vitest";
import {validatePath} from "../lib/security.js";

beforeAll(() => {
    process.env.KB_ROOT_PATH = '/tmp/test-kb';
});

describe('validatePath', () => {
    it('should allow valid relative paths', () => {
        expect(() => validatePath('docs/readme.md')).not.toThrow;
        expect(() => validatePath('config/server.json')).not.toThrow;
        expect(() => validatePath('subdir/file.txt')).not.toThrow;
    });

    it('should allow paths with ../ that stay within KB', () => {
        expect(() => validatePath('docs/../config/server.json')).not.toThrow;
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

})
