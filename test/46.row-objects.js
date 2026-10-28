'use strict';
const { writeFileSync } = require('fs');
const { spawnSync } = require('child_process');
const Database = require('../.');

describe('row objects', function () {
	beforeEach(function () {
		this.db = new Database(util.next());
	});
	afterEach(function () {
		this.db.close();
	});

	it('should use column names as keys, without escaping them', function () {
		const row = this.db.prepare('SELECT 1 AS "", 2 AS "a""b", 3 AS "back\\slash", 4 AS "new\nline", 5 AS "ünï©ødé 🚀", 6 AS "a b", 7 AS "${x}"').get();
		expect(Object.keys(row)).to.deep.equal(['', 'a"b', 'back\\slash', 'new\nline', 'ünï©ødé 🚀', 'a b', '${x}']);
		expect(row).to.deep.equal({ '': 1, 'a"b': 2, 'back\\slash': 3, 'new\nline': 4, 'ünï©ødé 🚀': 5, 'a b': 6, '${x}': 7 });
	});
	it('should order keys like an object literal would', function () {
		const row = this.db.prepare('SELECT 1 AS b, 2 AS "10", 3 AS "2", 4 AS a').get();
		expect(Object.keys(row)).to.deep.equal(['2', '10', 'b', 'a']);
		expect(row).to.deep.equal({ b: 1, 10: 2, 2: 3, a: 4 });
	});
	it('should use the last value for duplicate column names', function () {
		const row = this.db.prepare('SELECT 1 AS x, 2 AS y, 3 AS x').get();
		expect(Object.keys(row)).to.deep.equal(['x', 'y']);
		expect(row).to.deep.equal({ x: 3, y: 2 });
	});
	it('should create own properties for names that exist on Object.prototype', function () {
		const row = this.db.prepare('SELECT 1 AS constructor, 2 AS toString, 3 AS hasOwnProperty, 4 AS valueOf').get();
		expect(Object.getPrototypeOf(row)).to.equal(Object.prototype);
		expect(Object.keys(row)).to.deep.equal(['constructor', 'toString', 'hasOwnProperty', 'valueOf']);
		expect(row).to.deep.equal({ constructor: 1, toString: 2, hasOwnProperty: 3, valueOf: 4 });
	});
	it('should not create an own property for a "__proto__" column', function () {
		const row = this.db.prepare('SELECT 1 AS __proto__, 2 AS a').get();
		expect(Object.getPrototypeOf(row)).to.equal(Object.prototype);
		expect(Object.keys(row)).to.deep.equal(['a']);
		expect(row.a).to.equal(2);
	});
	it('should create plain, writable, enumerable and configurable properties', function () {
		const row = this.db.prepare("SELECT 'foo' AS a, NULL AS b").get();
		expect(Object.getPrototypeOf(row)).to.equal(Object.prototype);
		expect(Object.getOwnPropertyDescriptors(row)).to.deep.equal({
			a: { value: 'foo', writable: true, enumerable: true, configurable: true },
			b: { value: null, writable: true, enumerable: true, configurable: true },
		});
	});
	it('should return a new, independent object for every row', function () {
		this.db.prepare('CREATE TABLE entries (a TEXT, b INTEGER)').run();
		this.db.prepare("INSERT INTO entries VALUES ('foo', 1), ('bar', 2)").run();
		const stmt = this.db.prepare('SELECT * FROM entries ORDER BY rowid');
		const row1 = stmt.get();
		row1.a = 'changed';
		delete row1.b;
		row1.extra = true;
		const row2 = stmt.get();
		expect(row2).to.not.equal(row1);
		expect(row2).to.deep.equal({ a: 'foo', b: 1 });
		const rows = stmt.all();
		expect(rows[0]).to.not.equal(rows[1]);
		rows[0].a = 'changed';
		expect(rows).to.deep.equal([{ a: 'changed', b: 1 }, { a: 'bar', b: 2 }]);
		expect([...stmt.iterate()]).to.deep.equal([{ a: 'foo', b: 1 }, { a: 'bar', b: 2 }]);
	});
	it('should support many columns', function () {
		const count = 100;
		const columns = Array.from({ length: count }, (_, i) => `${i} AS c${i}`);
		const expected = Object.fromEntries(Array.from({ length: count }, (_, i) => [`c${i}`, i]));
		const stmt = this.db.prepare(`SELECT ${columns.join(', ')}`);
		expect(Object.keys(stmt.get())).to.deep.equal(Object.keys(expected));
		expect(stmt.get()).to.deep.equal(expected);
		expect(stmt.all()).to.deep.equal([expected]);
	});
	it('should pick up new column names after a schema change', function () {
		this.db.prepare('CREATE TABLE entries (a INTEGER)').run();
		this.db.prepare('INSERT INTO entries VALUES (1)').run();
		const stmt = this.db.prepare('SELECT * FROM entries');
		expect(stmt.get()).to.deep.equal({ a: 1 });
		this.db.prepare('ALTER TABLE entries ADD COLUMN b INTEGER DEFAULT 2').run();
		expect(stmt.get()).to.deep.equal({ a: 1, b: 2 });
		expect(stmt.all()).to.deep.equal([{ a: 1, b: 2 }]);
	});
});
