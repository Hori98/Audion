"""
Runtime shared state module for Audion backend.
Provides shared variables and state management across the application.
"""

class SharedState:
    """
    Shared state container for application-wide variables.
    Used to maintain database connections, cache, and other shared resources.
    """
    def __init__(self):
        # Database connection state
        self.db = None
        self.db_connected = False
        
        # RSS cache state
        self.RSS_CACHE = None
        
    def reset(self):
        """Reset all shared state to initial values."""
        self.db = None
        self.db_connected = False
        self.RSS_CACHE = None

# Global shared state instance
shared_state = SharedState()