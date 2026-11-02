"""Exercise the real migration constraints and transaction semantics in SQLite."""
import sqlite3, pathlib, unittest
class DatabaseTests(unittest.TestCase):
 def setUp(self):
  self.db=sqlite3.connect(':memory:');self.db.execute('PRAGMA foreign_keys=ON')
  self.db.executescript(next(pathlib.Path('drizzle').glob('*.sql')).read_text())
  self.db.execute("INSERT INTO products VALUES ('P','Latte','Coffee',1200,400,3,2)");self.db.commit()
 def sale(self,id,qty):
  with self.db:
   self.db.execute("INSERT INTO sales VALUES (?, 'P', ?,1200,400,'2026-01-01','manual')",(id,qty))
   self.db.execute("UPDATE products SET stock=stock-? WHERE id='P'",(qty,))
 def test_atomic_stock_and_snapshots(self):
  self.sale('S1',2)
  self.db.execute('UPDATE products SET price=1500,cost=500');self.db.commit()
  self.assertEqual(self.db.execute('SELECT stock FROM products').fetchone()[0],1)
  self.assertEqual(self.db.execute('SELECT quantity*(unit_price-unit_cost) FROM sales').fetchone()[0],1600)
 def test_oversell_rolls_back_both_records(self):
  with self.assertRaises(sqlite3.IntegrityError):self.sale('S1',4)
  self.assertEqual(self.db.execute('SELECT stock FROM products').fetchone()[0],3)
  self.assertEqual(self.db.execute('SELECT count(*) FROM sales').fetchone()[0],0)
 def test_duplicate_does_not_reduce_stock_twice(self):
  self.sale('S1',1)
  with self.assertRaises(sqlite3.IntegrityError):self.sale('S1',1)
  self.assertEqual(self.db.execute('SELECT stock FROM products').fetchone()[0],2)
if __name__=='__main__':unittest.main()
