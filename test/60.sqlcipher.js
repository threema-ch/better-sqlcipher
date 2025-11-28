'use strict';
const { readFileSync } = require('fs');
const Database = require('../.');
const { expect } = require('chai');

describe('sqlcipher', function() {
    const MAGIC = 'SQLite format 3';

    class Builder {
        constructor(db) {
            this.db = db;
        }

        withDerivedKey(key = 'meow') {
            this.db.pragma(`key = '${key}'`);
            return this;
        }

        withRawKey(key = '06fde20554abf0e09997a5df9bf6b44d343ed5bb6fea54b2788ef577e0f27434') {
            this.db.pragma(`key = "x'${key}'"`);
            return this;
        }

        withDummyData() {
            this.db.prepare('CREATE TABLE entries (a TEXT, b INTEGER, c REAL, d BLOB, e TEXT)').run();
            this.db.prepare("INSERT INTO entries WITH RECURSIVE temp(a, b, c, d, e) AS (SELECT 'foo', 1, 3.14, x'dddddddd', NULL UNION ALL SELECT a, b + 1, c, d, e FROM temp LIMIT 10) SELECT * FROM temp").run();
            return this;
        }
    }

	beforeEach(function () {
        this.builder = new Builder(new Database(util.next()));
	});
	afterEach(function () {
		this.builder.db.close();
    });

    it('should use bearssl (derived key)', function() {
        const db = this.builder
            .withDerivedKey()
            .db;
        expect(db.pragma('cipher_provider', { simple: true })).to.equal('bearssl');
    });

    it('should use bearssl (raw key)', function() {
        const db = this.builder
            .withRawKey()
            .db;
        expect(db.pragma('cipher_provider', { simple: true })).to.equal('bearssl');
    });

    it('should be plaintext without a key', function() {
        this.builder
            .withDummyData()
            .db
            .close();
        expect(readFileSync(util.current(), 'utf8')).to.satisfy(data => data.startsWith(MAGIC));
    });

    it('should not be plaintext with a raw key', function() {
        this.builder
            .withRawKey()
            .withDummyData()
            .db
            .close();
        expect(readFileSync(util.current(), 'utf8')).to.not.satisfy(data => data.startsWith(MAGIC));
    });

    it('should not be plaintext with a derived key', function() {
        this.builder
            .withDerivedKey()
            .withDummyData()
            .db
            .close();
        expect(readFileSync(util.current(), 'utf8')).to.not.satisfy(data => data.startsWith(MAGIC));
    });

    it('should fail to reopen without a key', function() {
        let db = this.builder
            .withRawKey()
            .withDummyData()
            .db;
        db.close();
        this.builder = new Builder(new Database(util.current()));
        expect(() => {
            db = this.builder
                .withDummyData()
                .db;
        }).to.throw(Database.SqliteError).with.property('code', 'SQLITE_NOTADB');;
    });

    it('should fail to reopen with wrong key', function() {
        let db = this.builder
            .withRawKey()
            .withDummyData()
            .db;
        db.close();
        this.builder = new Builder(new Database(util.current()));
        expect(() => {
            db = this.builder
                .withRawKey('0000000011111111222222223333333300000000111111112222222233333333')
                .withDummyData()
                .db;
        }).to.throw(Database.SqliteError).with.property('code', 'SQLITE_NOTADB');;
    });

    it('should succeed to reopen with same raw key', function() {
        let db = this.builder
            .withRawKey()
            .withDummyData()
            .db;
        const rows = db.prepare('SELECT * FROM entries').all();
        db.close();
        this.builder = new Builder(new Database(util.current()));
        db = this.builder
            .withRawKey()
            .db;
        expect(db.prepare('SELECT * FROM entries').all()).to.deep.equal(rows);
    });

    it('should succeed to reopen with same derived key', function() {
        let db = this.builder
            .withDerivedKey()
            .withDummyData()
            .db;
        const rows = db.prepare('SELECT * FROM entries').all();
        db.close();
        this.builder = new Builder(new Database(util.current()));
        db = this.builder
            .withDerivedKey()
            .db;
        expect(db.prepare('SELECT * FROM entries').all()).to.deep.equal(rows);
    });
});
