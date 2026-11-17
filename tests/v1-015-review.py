"""Offline release-preservation and export-input checks; hosted evidence is separate."""
import hashlib
import importlib.util
import json
from pathlib import Path
from html.parser import HTMLParser
import unittest

BASE = Path(__file__).resolve().parents[1] / 'docs/v1-015'
spec = importlib.util.spec_from_file_location('exports', BASE/'export-query.py')
exports = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exports)

class HTML(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.ids=[]; self.links=[]; self.feed(text)
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if 'id' in attrs: self.ids.append(attrs['id'])
        if tag=='a': self.links.append(attrs.get('href',''))

class Review(unittest.TestCase):
    def test_exact_two_file_scope_and_preservation(self):
        manifest=json.loads((BASE/'release-scope.json').read_text())
        self.assertEqual([f['path'] for f in manifest['files']],['privacy.html','contact.html'])
        for row in manifest['files']:
            old=(BASE/'preimages'/row['path']).read_bytes()
            new=(BASE/'runtime'/row['path']).read_bytes()
            self.assertEqual(hashlib.sha256(old).hexdigest(),row['before_sha256'])
            self.assertEqual(hashlib.sha256(new).hexdigest(),row['after_sha256'])
            a,b=old.decode(),new.decode()
            self.assertEqual(a.split('<main',1)[0],b.split('<main',1)[0])
            self.assertEqual(a.split('</main>',1)[1],b.split('</main>',1)[1])
            self.assertEqual(a.count('<script'),b.count('<script'))
            self.assertEqual(a.count('<form'),b.count('<form'))
    def test_anchors_and_process(self):
        text=(BASE/'runtime/privacy.html').read_text(); html=HTML(text)
        self.assertEqual(len(html.ids),len(set(html.ids)))
        for link in html.links:
            if link.startswith('#'): self.assertIn(link[1:],html.ids)
        for id_ in ['overview','accounts','enquiries','bookings','business-records','waitlist','cookies','storage','rights','export','closure']:
            self.assertIn(id_,html.ids)
        self.assertIn('There is currently no automatic account or business-record purge',text)
        self.assertIn('A deliberately published preview website is also public',text)
        self.assertIn('Farai Chitekedza',text)
        self.assertIn('hello@faraios.com',text)
    def test_query_rejects_ambiguous_or_injected_scope(self):
        uid='2f16e658-e031-4c4a-930a-2731ec1d1492'
        for args in [("';delete from businesses;--",uid,'live'),(uid,'', 'live'),(uid,uid,'all')]:
            with self.assertRaises(ValueError):exports.query(*args)
        sql=exports.query(uid,uid,'preview')
        self.assertIn('scope_verified',sql)
        self.assertIn('owner_id=',sql)
        self.assertNotIn('share_token',sql)
        self.assertNotIn('auth.users',sql)
        self.assertNotIn('SELECT *',sql)
        self.assertEqual(len(exports.FIELDS),17)
        for table,fields in exports.FIELDS.items():
            self.assertNotIn('share_token',fields)
            self.assertIn('FROM public.'+table,sql)
        self.assertIn('e.id=t.enquiry_id',sql)
        self.assertIn("e.environment='preview'",sql)

if __name__=='__main__':unittest.main(verbosity=2)
