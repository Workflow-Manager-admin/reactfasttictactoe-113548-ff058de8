from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi import status
from pydantic import BaseModel, Field
from typing import List, Optional, Literal

# FastAPI metadata (OpenAPI doc description)
app = FastAPI(
    title="Tic Tac Toe Backend API",
    description=(
        "FastAPI backend providing REST endpoints to manage "
        "Tic Tac Toe game logic and state."
    ),
    version="1.0.0",
    openapi_tags=[
        {"name": "TicTacToe", "description": "Tic Tac Toe game endpoints"}
    ]
)

# Enable CORS support for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GameState(BaseModel):
    board: List[List[Optional[Literal['X', 'O']]]] = Field(
        ...,
        description=(
            "3x3 game board (rows × columns); values are 'X', 'O', or None"
        )
    )
    current_player: Literal['X', 'O'] = Field(
        ...,
        description="Player whose turn it is next"
    )
    status: Literal['in_progress', 'won', 'draw'] = Field(
        ...,
        description="Game status: in progress, won, or draw"
    )
    winner: Optional[Literal['X', 'O']] = Field(
        None,
        description="Winner of the game if any"
    )


class StartGameResponse(BaseModel):
    game: GameState


class MakeMoveRequest(BaseModel):
    row: int = Field(
        ...,
        ge=0,
        le=2,
        description="Board row (0-2)"
    )
    col: int = Field(
        ...,
        ge=0,
        le=2,
        description="Board column (0-2)"
    )


class MakeMoveResponse(BaseModel):
    game: GameState
    message: Optional[str] = Field(
        None,
        description="Informational message (e.g., invalid move, won, draw)"
    )


class ResetGameResponse(BaseModel):
    game: GameState


class WinnerResponse(BaseModel):
    status: Literal['in_progress', 'won', 'draw']
    winner: Optional[Literal['X', 'O']]


class TicTacToeManager:
    """Manages single Tic Tac Toe game state in memory (not persistent between restarts)."""

    def __init__(self):
        self._initial_state()

    # PUBLIC_INTERFACE
    def start_new_game(self):
        self._initial_state()

    # PUBLIC_INTERFACE
    def get_state(self) -> GameState:
        return GameState(
            board=[row[:] for row in self.board],
            current_player=self.current_player,
            status=self.status,
            winner=self.winner
        )

    # PUBLIC_INTERFACE
    def make_move(self, row: int, col: int) -> (GameState, Optional[str]):
        if self.status != 'in_progress':
            return self.get_state(), "Game is over. Please reset to play again."

        # Check position validity
        if not (0 <= row <= 2 and 0 <= col <= 2):
            return self.get_state(), "Move is out of bounds."

        if self.board[row][col] is not None:
            return self.get_state(), "Cell is already occupied!"

        self.board[row][col] = self.current_player

        if self._check_winner(self.current_player):
            self.status = 'won'
            self.winner = self.current_player
            message = f"Player {self.current_player} wins!"
        elif self._is_draw():
            self.status = 'draw'
            self.winner = None
            message = "The game is a draw."
        else:
            self.current_player = 'O' if self.current_player == 'X' else 'X'
            message = None

        return self.get_state(), message

    # PUBLIC_INTERFACE
    def reset_game(self):
        self._initial_state()

    def _initial_state(self):
        self.board = [[None for _ in range(3)] for _ in range(3)]
        self.current_player = 'X'
        self.status = 'in_progress'
        self.winner = None

    def _check_winner(self, player: str) -> bool:
        b = self.board
        win_conditions = [
            [b[0][0], b[0][1], b[0][2]],
            [b[1][0], b[1][1], b[1][2]],
            [b[2][0], b[2][1], b[2][2]],
            [b[0][0], b[1][0], b[2][0]],
            [b[0][1], b[1][1], b[2][1]],
            [b[0][2], b[1][2], b[2][2]],
            [b[0][0], b[1][1], b[2][2]],
            [b[0][2], b[1][1], b[2][0]],
        ]
        return any([
            all([cell == player for cell in line]) for line in win_conditions
        ])

    def _is_draw(self) -> bool:
        return (
            all(cell is not None for row in self.board for cell in row)
            and self.status == 'in_progress'
        )


game_manager = TicTacToeManager()


@app.get(
    "/", 
    tags=["Health"],
    summary="Health check endpoint",
    description="Simple health check endpoint."
)
def health_check():
    """Check if the API is running."""
    return {"message": "Healthy"}


@app.post(
    "/game/start",
    response_model=StartGameResponse,
    tags=["TicTacToe"],
    summary="Start a new Tic Tac Toe game",
    description="Starts a new game, resets the board and first player to 'X'."
)
def start_game():
    """Start a new game or reset the board."""
    game_manager.start_new_game()
    return StartGameResponse(game=game_manager.get_state())


@app.get(
    "/game/state",
    response_model=GameState,
    tags=["TicTacToe"],
    summary="Get current game board state",
    description=(
        "Fetch the current Tic Tac Toe 3x3 board state, current player, status, "
        "and winner (if any)."
    )
)
def get_game_state():
    """Retrieve the current game state."""
    return game_manager.get_state()


@app.post(
    "/game/move",
    response_model=MakeMoveResponse,
    tags=["TicTacToe"],
    summary="Make a move on the game board",
    description=(
        "Provide a row and column to make a move as the current player. "
        "Returns the new state and message if invalid."
    )
)
def make_move(move: MakeMoveRequest):
    """Attempt to make a move for the current player at the given row/col."""
    state, msg = game_manager.make_move(move.row, move.col)
    if msg and state.status == 'in_progress':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    return MakeMoveResponse(game=state, message=msg)


@app.get(
    "/game/winner",
    response_model=WinnerResponse,
    tags=["TicTacToe"],
    summary="Get winner/draw status",
    description="Returns if the game has a winner or is a draw, or still in progress."
)
def get_winner_status():
    """Get current game winning/draw status."""
    state = game_manager.get_state()
    status_ = state.status
    winner = state.winner
    return WinnerResponse(status=status_, winner=winner)


@app.post(
    "/game/reset",
    response_model=ResetGameResponse,
    tags=["TicTacToe"],
    summary="Reset the game",
    description=(
        "Resets the board and status to start a new game "
        "(always starts with 'X')."
    )
)
def reset_game():
    """Reset the game to its initial state."""
    game_manager.reset_game()
    return ResetGameResponse(game=game_manager.get_state())
