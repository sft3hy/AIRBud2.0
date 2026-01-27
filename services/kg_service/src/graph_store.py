from neo4j import GraphDatabase
from .config import settings

class Neo4jStore:
    def __init__(self):
        self.driver = GraphDatabase.driver(
            settings.NEO4J_URI, 
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
        )

    def close(self):
        self.driver.close()

    def insert_triples(self, triples, doc_id, collection_id):
        """
        Inserts triples and links them to the Document node.
        """
        if not triples: return

        # --- FIX: Filter out malformed triples (None/Empty values) ---
        valid_triples = [
            t for t in triples 
            if t.get("subject") and t.get("object") and t.get("predicate")
        ]
        
        if not valid_triples:
            print(f"Skipping doc {doc_id}: No valid triples found after filtering.")
            return
        # -------------------------------------------------------------

        query = """
        MERGE (d:Document {id: $doc_id})
        SET d.collection_id = $collection_id
        
        FOREACH (t IN $triples |
            MERGE (s:Entity {name: t.subject})
            SET s.type = t.type
            
            MERGE (o:Entity {name: t.object})
            SET o.type = t.object_type
            
            MERGE (s)-[r:RELATED {type: t.predicate}]->(o)
            
            MERGE (s)-[:MENTIONED_IN]->(d)
            MERGE (o)-[:MENTIONED_IN]->(d)
        )
        """
        try:
            with self.driver.session() as session:
                # Use valid_triples instead of raw triples
                session.run(query, triples=valid_triples, doc_id=doc_id, collection_id=collection_id)
        except Exception as e:
            print(f"Neo4j Write Error: {e}")

    def search_subgraph(self, query_text, collection_id):
        """
        Find entities in the graph related to the query within the specific collection.
        """
        cypher = """
        MATCH (e:Entity)-[r:RELATED]-(neighbor)
        WHERE 
            $question CONTAINS toLower(e.name) 
            AND (e)-[:MENTIONED_IN]->(:Document {collection_id: $collection_id})
        RETURN e.name as source, r.type as rel, neighbor.name as target, neighbor.type as target_type
        LIMIT 50
        """
        
        try:
            with self.driver.session() as session:
                result = session.run(cypher, question=query_text.lower(), collection_id=collection_id)
                return [record.data() for record in result]
        except Exception as e:
            print(f"Neo4j Search Error: {e}")
            return []

    def delete_collection(self, collection_id):
        # 1. Delete all documents in collection
        query = """
        MATCH (d:Document {collection_id: $cid})
        OPTIONAL MATCH (d)<-[:MENTIONED_IN]-(e:Entity)
        WITH d, collect(e) as candidates
        DETACH DELETE d
        
        WITH candidates
        UNWIND candidates as e
        MATCH (e)
        WHERE NOT (e)-[:MENTIONED_IN]->(:Document)
        DETACH DELETE e
        """
        try:
            with self.driver.session() as session:
                session.run(query, cid=collection_id)
        except Exception as e:
            print(f"Neo4j Delete Collection Error: {e}")

    def delete_document(self, doc_id):
        """
        Deletes the Document node and any Entities that are no longer 
        connected to any other documents (orphans).
        Uses targeted candidate selection for performance.
        """
        query = """
        MATCH (d:Document {id: $doc_id})
        OPTIONAL MATCH (d)<-[:MENTIONED_IN]-(e:Entity)
        WITH d, collect(e) as candidates
        DETACH DELETE d
        
        WITH candidates
        UNWIND candidates as e
        MATCH (e)
        WHERE NOT (e)-[:MENTIONED_IN]->(:Document)
        DETACH DELETE e
        """
        
        try:
            with self.driver.session() as session:
                session.run(query, doc_id=doc_id)
        except Exception as e:
            print(f"Neo4j Document Delete Error: {e}")
        except Exception as e:
            print(f"Neo4j Document Delete Error: {e}")
