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

        # FIX: Removed comments (#) inside FOREACH which cause syntax errors in some Neo4j versions
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
                session.run(query, triples=triples, doc_id=doc_id, collection_id=collection_id)
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
        query = """
        MATCH (d:Document {collection_id: $cid})
        DETACH DELETE d
        """
        try:
            with self.driver.session() as session:
                session.run(query, cid=collection_id)
        except Exception as e:
            print(f"Neo4j Delete Error: {e}")