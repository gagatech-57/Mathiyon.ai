"""
Mathiyon AI Graph Algorithms Module
Implements graph algorithms: BFS, DFS, Dijkstra's Shortest Path, Kruskal's MST, Prim's MST, and Topological Sort.
"""
import heapq
from collections import deque

class GraphSolver:
    @staticmethod
    def bfs(graph: dict, start_node) -> list:
        """Breadth-First Search traversal."""
        visited = []
        queue = deque([start_node])
        seen = {start_node}
        
        while queue:
            node = queue.popleft()
            visited.append(node)
            for neighbor in graph.get(node, []):
                if neighbor not in seen:
                    seen.add(neighbor)
                    queue.append(neighbor)
        return visited

    @staticmethod
    def dfs(graph: dict, start_node) -> list:
        """Depth-First Search traversal."""
        visited = []
        stack = [start_node]
        seen = set()
        
        while stack:
            node = stack.pop()
            if node not in seen:
                seen.add(node)
                visited.append(node)
                # Add neighbors in reverse order to maintain left-to-right order
                for neighbor in reversed(graph.get(node, [])):
                    if neighbor not in seen:
                        stack.append(neighbor)
        return visited

    @staticmethod
    def dijkstra(weighted_graph: dict, start_node) -> dict:
        """Dijkstra's Shortest Path algorithm for weighted graphs."""
        distances = {node: float('inf') for node in weighted_graph}
        distances[start_node] = 0
        pq = [(0, start_node)]
        
        while pq:
            curr_dist, curr_node = heapq.heappop(pq)
            if curr_dist > distances[curr_node]:
                continue
                
            for neighbor, weight in weighted_graph.get(curr_node, []):
                distance = curr_dist + weight
                if distance < distances[neighbor]:
                    distances[neighbor] = distance
                    heapq.heappush(pq, (distance, neighbor))
                    
        return distances
