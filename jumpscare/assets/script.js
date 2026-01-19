// Game variables
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const scoreEl = document.getElementById('score');
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        const tileSize = 20;
        const cols = 28;
        const rows = 31;

        let maze = [];
        let player = {};
        let ghosts = [];
        let score = 0;
        let lives = 3;
        let gameRunning = false;
        let gamePaused = false;
        let totalDots = 0;
        let frame = 0;
        let animationId = null;

        const keys = {};

        // Event Listeners
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', e => keys[e.key] = false);

        function handleKeyDown(e) {
            keys[e.key] = true;
            
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }
            
            if (e.key === 'p' || e.key === 'P') {
                if (gameRunning) {
                    togglePause();
                }
            }
        }

        // Audio
        function playJumpscareSound() {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.1);
            osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
            
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.5);
        }

        // Game initialization
        function initGame() {
            maze = [];
            totalDots = 0;
            
            for (let y = 0; y < rows; y++) {
                maze[y] = [];
                for (let x = 0; x < cols; x++) {
                    if (y === 0 || y === rows - 1 || x === 0 || x === cols - 1) {
                        maze[y][x] = 1;
                    } else if (y % 4 === 0 && x % 4 === 0 && Math.random() > 0.3) {
                        maze[y][x] = 1;
                    } else {
                        maze[y][x] = 2;
                        totalDots++;
                    }
                }
            }

            player = { x: 1, y: 1, dir: 0, nextDir: 0, mouth: 0 };
            ghosts = [
                { x: 13, y: 11, dir: 0, color: '#f00' },
                { x: 14, y: 11, dir: 1, color: '#0ff' },
                { x: 13, y: 12, dir: 2, color: '#f0f' },
                { x: 14, y: 12, dir: 3, color: '#f80' }
            ];
            
            score = 0;
            lives = 3;
            frame = 0;
        }

        function startGame() {
            document.getElementById('homeScreen').style.display = 'none';
            document.getElementById('gameContainer').style.display = 'block';
            initGame();
            gameRunning = true;
            gamePaused = false;
            gameLoop();
        }

        function restartGame() {
            document.getElementById('gameOver').style.display = 'none';
            initGame();
            gameRunning = true;
            gamePaused = false;
            gameLoop();
        }

        function returnHome() {
            document.getElementById('gameOver').style.display = 'none';
            document.getElementById('pauseScreen').style.display = 'none';
            document.getElementById('gameContainer').style.display = 'none';
            document.getElementById('homeScreen').style.display = 'flex';
            gameRunning = false;
            gamePaused = false;
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        }

        function togglePause() {
            if (!gameRunning) return;
            
            gamePaused = !gamePaused;
            
            if (gamePaused) {
                document.getElementById('pauseScreen').style.display = 'flex';
            } else {
                document.getElementById('pauseScreen').style.display = 'none';
            }
        }

        // Drawing functions
        function drawMaze() {
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    if (maze[y][x] === 1) {
                        ctx.fillStyle = '#00f';
                        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
                        ctx.strokeStyle = '#0088ff';
                        ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
                    } else if (maze[y][x] === 2) {
                        ctx.fillStyle = '#fff';
                        ctx.beginPath();
                        ctx.arc(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }

        function drawPlayer() {
            const px = player.x * tileSize + tileSize / 2;
            const py = player.y * tileSize + tileSize / 2;
            const radius = tileSize / 2 - 2;
            
            ctx.fillStyle = '#ff0';
            ctx.beginPath();
            
            const mouthAngle = Math.abs(Math.sin(player.mouth)) * 0.3;
            const startAngle = mouthAngle + player.dir * Math.PI / 2;
            const endAngle = -mouthAngle + player.dir * Math.PI / 2;
            
            ctx.arc(px, py, radius, startAngle, endAngle);
            ctx.lineTo(px, py);
            ctx.fill();
        }

        function drawGhosts() {
            ghosts.forEach(ghost => {
                const gx = ghost.x * tileSize + tileSize / 2;
                const gy = ghost.y * tileSize + tileSize / 2;
                const radius = tileSize / 2 - 2;
                
                ctx.fillStyle = ghost.color;
                ctx.beginPath();
                ctx.arc(gx, gy, radius, Math.PI, 0);
                ctx.lineTo(gx + radius, gy + radius);
                ctx.lineTo(gx + radius / 2, gy + radius / 2);
                ctx.lineTo(gx, gy + radius);
                ctx.lineTo(gx - radius / 2, gy + radius / 2);
                ctx.lineTo(gx - radius, gy + radius);
                ctx.closePath();
                ctx.fill();
                
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(gx - 4, gy - 2, 3, 0, Math.PI * 2);
                ctx.arc(gx + 4, gy - 2, 3, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#00f';
                ctx.beginPath();
                ctx.arc(gx - 4, gy - 2, 1.5, 0, Math.PI * 2);
                ctx.arc(gx + 4, gy - 2, 1.5, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // Game logic
        function movePlayer() {
            if (keys['ArrowUp'] || keys['w'] || keys['W']) player.nextDir = 3;
            if (keys['ArrowDown'] || keys['s'] || keys['S']) player.nextDir = 1;
            if (keys['ArrowLeft'] || keys['a'] || keys['A']) player.nextDir = 2;
            if (keys['ArrowRight'] || keys['d'] || keys['D']) player.nextDir = 0;
            
            const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
            let [dx, dy] = dirs[player.nextDir];
            
            if (maze[player.y + dy] && maze[player.y + dy][player.x + dx] !== 1) {
                player.dir = player.nextDir;
            }
            
            [dx, dy] = dirs[player.dir];
            const newX = player.x + dx;
            const newY = player.y + dy;
            
            if (maze[newY] && maze[newY][newX] !== 1) {
                player.x = newX;
                player.y = newY;
                
                if (maze[newY][newX] === 2) {
                    maze[newY][newX] = 0;
                    score += 10;
                    totalDots--;
                }
            }
            
            player.mouth += 0.3;
        }

        function moveGhosts() {
            ghosts.forEach(ghost => {
                const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
                const validDirs = [];
                
                dirs.forEach((d, i) => {
                    const nx = ghost.x + d[0];
                    const ny = ghost.y + d[1];
                    if (maze[ny] && maze[ny][nx] !== 1) {
                        validDirs.push(i);
                    }
                });
                
                if (Math.random() > 0.3) {
                    const dx = player.x - ghost.x;
                    const dy = player.y - ghost.y;
                    
                    if (Math.abs(dx) > Math.abs(dy)) {
                        const preferredDir = dx > 0 ? 0 : 2;
                        if (validDirs.includes(preferredDir)) ghost.dir = preferredDir;
                    } else {
                        const preferredDir = dy > 0 ? 1 : 3;
                        if (validDirs.includes(preferredDir)) ghost.dir = preferredDir;
                    }
                }
                
                if (!validDirs.includes(ghost.dir)) {
                    ghost.dir = validDirs[Math.floor(Math.random() * validDirs.length)];
                }
                
                const [dx, dy] = dirs[ghost.dir];
                ghost.x += dx;
                ghost.y += dy;
            });
        }

        function checkCollision() {
            ghosts.forEach(ghost => {
                if (ghost.x === player.x && ghost.y === player.y) {
                    showJumpscare();
                }
            });
        }

        function showJumpscare() {
            gameRunning = false;
            playJumpscareSound();
            document.getElementById('jumpscare').style.display = 'flex';
            
            setTimeout(() => {
                document.getElementById('jumpscare').style.display = 'none';
                lives--;
                
                if (lives <= 0) {
                    document.getElementById('finalScore').textContent = score;
                    document.getElementById('gameOver').style.display = 'flex';
                } else {
                    player.x = 1;
                    player.y = 1;
                    ghosts = [
                        { x: 13, y: 11, dir: 0, color: '#f00' },
                        { x: 14, y: 11, dir: 1, color: '#0ff' },
                        { x: 13, y: 12, dir: 2, color: '#f0f' },
                        { x: 14, y: 12, dir: 3, color: '#f80' }
                    ];
                    gameRunning = true;
                }
            }, 1000);
        }

        // Main game loop
        function gameLoop() {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            drawMaze();
            drawPlayer();
            drawGhosts();
            
            if (gameRunning && !gamePaused) {
                frame++;
                if (frame % 10 === 0) {
                    movePlayer();
                    checkCollision();
                }
                if (frame % 15 === 0) {
                    moveGhosts();
                    checkCollision();
                }
                
                if (totalDots === 0) {
                    gameRunning = false;
                    alert('You Win! Score: ' + score);
                    returnHome();
                    return;
                }
            }
            
            scoreEl.textContent = `Score: ${score} | Lives: ${lives}`;
            animationId = requestAnimationFrame(gameLoop);
        }