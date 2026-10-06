import copy, unittest, json, io, urllib.error, threading, urllib.request, http.client
from unittest.mock import patch
import server
from metadata import enrich, applies

class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.evidence=[{'id':'1','text':'4.1. Shirt. The shirt will be light blue.','publication':'Test regulation','pdf_page':2,'url':'https://example.test/one.pdf','scope':'national','index_context':'test'}]
        self.answer={'status':'supported','answer':'Light blue is specified.','citations':[{'source_id':'1','locator':'4.1.','quote':'The shirt will be light blue.'}]}
    def test_valid_quote_receives_server_owned_source(self):
        result=server.validate(copy.deepcopy(self.answer),self.evidence)
        self.assertEqual(result['citations'][0]['pdf_page'],2)
    def test_invented_quote_is_rejected(self):
        a=copy.deepcopy(self.answer);a['citations'][0]['quote']='Pink shirts are authorized.'
        with self.assertRaises(ValueError):server.validate(a,self.evidence)
    def test_invented_locator_is_rejected(self):
        a=copy.deepcopy(self.answer);a['citations'][0]['locator']='9.9.9.'
        with self.assertRaises(ValueError):server.validate(a,self.evidence)
    def test_unsupported_conclusion_is_rejected(self):
        with self.assertRaises(ValueError):server.validate({'status':'supported','citations':[]},self.evidence)
    def test_one_source_conflict_is_rejected(self):
        a=copy.deepcopy(self.answer);a['status']='conflict'
        with self.assertRaises(ValueError):server.validate(a,self.evidence)
    def test_blues_question_retrieves_uniform_publication(self):
        hits=server.retrieve('Can I wear a pink shirt with my blues?','national')
        self.assertTrue(any('39-1' in h['publication'] for h in hits))
    def test_national_scope_excludes_local_supplements(self):
        self.assertTrue(all(x['scope']=='national' for x in server.retrieve('uniform shirt','national')))
    def test_blues_answer_has_authorized_shirt_provision(self):
        hits=server.retrieve('Can I wear a pink shirt with my blues?','national')
        self.assertTrue(any('light blue in color' in server.normal(h['text']).lower() for h in hits[:8]))
    def test_general_information_does_not_require_fake_citation(self):
        self.assertEqual(server.validate({'status':'informational','answer':'Hello.','citations':[]},[])['status'],'informational')
    def test_both_sides_of_conflict_are_verified(self):
        other={**self.evidence[0],'id':'2','text':'4.2. The shirt will be white.'}
        a={**self.answer,'status':'conflict','guidance':'Seek clarification.','citations':self.answer['citations']+[{'source_id':'2','quote':'The shirt will be white.','locator':'4.2.'}],'conflicts':[{'source_ids':['1','2'],'explanation':'The color differs.'}]}
        self.assertEqual(server.validate(a,self.evidence+[other])['status'],'conflict')
    def test_wrong_conflict_reference_rejected(self):
        a=copy.deepcopy(self.answer);a['conflicts']=[{'source_ids':['1','99'],'explanation':'Conflict.'}]
        with self.assertRaises(ValueError):server.validate(a,self.evidence)
    def test_wing_filters_include_parent_and_exclude_other_wings(self):
        for scope,want in [('national',True),('NJWG',True),('NER',True),('NYWG',False),('MAR',False)]:
            self.assertEqual(applies({'scope':scope},'NJWG'),want)
    def test_trailing_slash_index_scope_repaired(self):
        d=enrich({'title':'R39-1','index_text':' NJWG R39-1 Current','indexes':['https://www.gocivilairpatrol.com/members/publications/approved-supplements-and-ois-by-region/northeast-region/']})
        self.assertEqual(d['scope'],'NJWG');self.assertEqual(d['region'],'NER')
    def test_quota_and_rate_limit_have_different_actions(self):
        self.assertIn('credits',server.api_error(429,{'error':{'code':'insufficient_quota'}}))
        self.assertIn('Wait',server.api_error(429,{'error':{'code':'rate_limit_exceeded'}}))

class ApiFlowTests(unittest.TestCase):
    def test_planner_uses_catalog_and_limits_queries(self):
        plan={'queries':['minimum age cadet membership eligibility'],'publication_hints':['R39-2']}
        with patch.object(server,'invoke_model',return_value=json.dumps(plan)) as call:
            result=server.plan_question('How old must I be?','cadet',[])
            payload=json.loads(call.call_args.args[0]['input'])
            self.assertTrue(payload['catalog']);self.assertEqual(result['publication_hints'],['R39-2'])
    def test_malformed_planner_falls_back_without_inventing_queries(self):
        with patch.object(server,'invoke_model',return_value='{}'):
            self.assertEqual(server.plan_question('membership','',''),{'queries':[],'publication_hints':[]})
    def test_invalid_quote_is_corrected_once(self):
        evidence=[{'id':'1','publication':'Test','index_context':'test','scope':'national','url':'https://example.test/r.pdf','pdf_page':3,'text':'4.1. The shirt will be light blue.'}]
        base={'status':'supported','answer':'Light blue is specified.','applicability':'Test','guidance':'','citations':[{'source_id':'1','locator':'4.1.','quote':'The shirt will be light blue.'}],'conflicts':[]}
        bad=copy.deepcopy(base);bad['citations'][0]['quote']='Pink shirts are authorized.'
        with patch.object(server,'plan_question',return_value={'queries':[],'publication_hints':[]}),patch.object(server,'retrieve',return_value=evidence),patch.object(server,'invoke_model',side_effect=[json.dumps(bad),json.dumps(base)]) as call:
            self.assertEqual(server.answer_question('shirt?','national','',[])['status'],'supported');self.assertEqual(call.call_count,2)
    def test_api_request_uses_schema_and_returns_real_source(self):
        evidence=[{'id':'1','publication':'Test','index_context':'test','scope':'national','url':'https://example.test/r.pdf','pdf_page':3,'text':'4.1. The shirt will be light blue.'}]
        answer={'status':'supported','answer':'Light blue is specified.','applicability':'Test','guidance':'','citations':[{'source_id':'1','locator':'4.1.','quote':'The shirt will be light blue.'}],'conflicts':[]}
        response={'status':'completed','output':[{'type':'message','content':[{'type':'output_text','text':json.dumps(answer)}]}]}
        class FakeResponse(io.BytesIO):
            def __enter__(self):return self
            def __exit__(self,*args):self.close()
        with patch.object(server,'plan_question',return_value={'queries':[],'publication_hints':[]}),patch.object(server,'retrieve',return_value=evidence),patch.object(server,'key',return_value='test-placeholder'),patch.object(server.urllib.request,'urlopen',return_value=FakeResponse(json.dumps(response).encode())) as call:
            result=server.answer_question('shirt?','national','',[])
            request=call.call_args.args[0];payload=json.loads(request.data)
            self.assertEqual(payload['text']['format']['type'],'json_schema');self.assertFalse(payload['store'])
            self.assertEqual(result['citations'][0]['pdf_page'],3)
    def test_secret_files_not_served_and_invalid_origin_rejected(self):
        httpd=server.http.server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
        thread=threading.Thread(target=httpd.serve_forever,daemon=True);thread.start()
        try:
            connection=http.client.HTTPConnection('127.0.0.1',httpd.server_port)
            connection.request('GET','/.env.local');self.assertEqual(connection.getresponse().status,404);connection.close()
            connection=http.client.HTTPConnection('127.0.0.1',httpd.server_port)
            connection.request('POST','/api/chat',body='{}',headers={'Origin':'https://example.test','Content-Type':'application/json'});self.assertEqual(connection.getresponse().status,403);connection.close()
        finally:httpd.shutdown();httpd.server_close();thread.join()

if __name__=='__main__':unittest.main()
