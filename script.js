document.addEventListener('DOMContentLoaded', () => {

    const PIECE_SVGS={'w_pawn':'img/pawn-w.svg','b_pawn':'img/pawn-b.svg','w_rook':'img/rook-w.svg','b_rook':'img/rook-b.svg','w_knight':'img/knight-w.svg','b_knight':'img/knight-b.svg','w_bishop':'img/bishop-w.svg','b_bishop':'img/bishop-b.svg','w_queen':'img/queen-w.svg','b_queen':'img/queen-b.svg','w_king':'img/king-w.svg','b_king':'img/king-b.svg'};
    const grid=document.getElementById('chess-grid'),gameStatusEl=document.querySelector('#game-status span'),whiteCapturedEl=document.querySelector('#white-captured .captured-pieces'),blackCapturedEl=document.querySelector('#black-captured .captured-pieces'),newGameButton=document.getElementById('new-game-button'),undoButton=document.getElementById('undo-button'),promotionModal=document.getElementById('promotion-modal'),promotionChoicesEl=document.getElementById('promotion-choices'),gameOverModal=document.getElementById('game-over-modal'),gameOverMessageEl=document.getElementById('game-over-message'),playAgainButton=document.getElementById('play-again-button');
    let boardState,currentPlayer,selectedSquare,validMoves,moveHistory,enPassantTarget,isGameOver,isAnimating=!1;

    const CAPTURE_ORDER = ['pawn','pawn','pawn','pawn','pawn','pawn','pawn','pawn','knight','knight','bishop','bishop','rook','rook','queen','king'];

    function initializeGame(){
        boardState=createInitialBoard();
        currentPlayer='w';
        selectedSquare=null;
        validMoves=[];
        moveHistory=[];
        enPassantTarget=null;
        isGameOver=!1;
        isAnimating=!1;
        createCaptureSlots();
        renderBoard();
        updateStatus();
        undoButton.disabled=!0;
        gameOverModal.classList.add('hidden');
        updateCapturedContainersVisibility();
        startSolanaSnowfall();
    }
    
    // --- SOLANA SNOWFALL EFFECT ---
    function startSolanaSnowfall() {
        // Clear any existing snowflakes
        document.querySelectorAll('.solana-snowflake').forEach(el => el.remove());
        
        // Create snowflakes
        const snowflakeCount = window.innerWidth < 768 ? 15 : 30; // Fewer on mobile
        
        for (let i = 0; i < snowflakeCount; i++) {
            createSolanaSnowflake(i * 500); // Stagger creation
        }
        
        // Continuously create new snowflakes
        setInterval(() => {
            createSolanaSnowflake(0);
        }, 1500);
    }
    
    function createSolanaSnowflake(delay) {
        setTimeout(() => {
            const snowflake = document.createElement('div');
            snowflake.classList.add('solana-snowflake');
            
            // Random position
            const left = Math.random() * 100;
            snowflake.style.left = `${left}vw`;
            
            // Random size
            const size = 20 + Math.random() * 20;
            snowflake.style.width = `${size}px`;
            snowflake.style.height = `${size}px`;
            
            // Random animation duration (5-10 seconds)
            const duration = 5 + Math.random() * 5;
            snowflake.style.animationDuration = `${duration}s`;
            
            // Random opacity
            snowflake.style.opacity = (0.3 + Math.random() * 0.5).toString();
            
            document.body.appendChild(snowflake);
            
            // Remove snowflake after animation completes
            setTimeout(() => {
                if (snowflake.parentNode) {
                    snowflake.parentNode.removeChild(snowflake);
                }
            }, duration * 1000);
        }, delay);
    }
    
    // --- FINALIZED SLOT CREATION ---
    function createCaptureSlots() {
        whiteCapturedEl.innerHTML = '';
        blackCapturedEl.innerHTML = '';
        CAPTURE_ORDER.forEach(pieceType => {
            [whiteCapturedEl, blackCapturedEl].forEach(container => {
                const slot = document.createElement('div');
                slot.classList.add('capture-slot');
                if (pieceType === 'king') {
                    slot.classList.add('king-slot');
                }
                container.appendChild(slot);
            });
        });
    }

    function createInitialBoard(){const b=Array(8).fill(null).map(()=>Array(8).fill(null));const p=(pc,r,c)=>{b[r][c]={piece:pc,hasMoved:!1}};for(let c=0;c<8;c++){p('w_pawn',6,c);p('b_pawn',1,c)}const br=['rook','knight','bishop','queen','king','bishop','knight','rook'];for(let c=0;c<8;c++){p(`w_${br[c]}`,7,c);p(`b_${br[c]}`,0,c)}return b}
    
    function renderBoard(){grid.innerHTML='';let kingInCheckPos=isKingInCheck(currentPlayer)?findKing(currentPlayer):null;for(let r=0;r<8;r++){for(let c=0;c<8;c++){const s=document.createElement('div');s.classList.add('square',(r+c)%2===0?'light':'dark');s.dataset.r=r;s.dataset.c=c;const pD=boardState[r][c];if(pD){const pE=document.createElement('div');pE.classList.add('piece');pE.style.backgroundImage=`url('${PIECE_SVGS[pD.piece]}')`;pE.dataset.pieceType=pD.piece.split('_')[1];s.appendChild(pE)}if(kingInCheckPos&&kingInCheckPos.r===r&&kingInCheckPos.c===c){s.classList.add('in-check')}grid.appendChild(s)}}}
    
    function handleSquareClick(e){if(isGameOver||isAnimating||currentPlayer==='b')return;const s=e.target.closest('.square');if(!s)return;const r=parseInt(s.dataset.r),c=parseInt(s.dataset.c),pD=boardState[r][c];if(selectedSquare){if(validMoves.some(m=>m.r===r&&m.c===c)){animateAndMakeMove(selectedSquare.r,selectedSquare.c,r,c)}else{clearHighlights();if(pD&&pD.piece.startsWith(currentPlayer))selectPiece(r,c)}}else if(pD&&pD.piece.startsWith(currentPlayer))selectPiece(r,c)}
    
    function selectPiece(r,c){clearHighlights();selectedSquare={r,c};document.querySelector(`[data-r='${r}'][data-c='${c}']`).classList.add('selected');validMoves=getValidMovesForPiece(r,c);highlightValidMoves()}
    function clearHighlights(){selectedSquare=null;validMoves=[];document.querySelectorAll('.square.selected').forEach(s=>s.classList.remove('selected'));document.querySelectorAll('.valid-move-indicator, .valid-capture-indicator').forEach(i=>i.remove())}
    function highlightValidMoves(){validMoves.forEach(m=>{const s=document.querySelector(`[data-r='${m.r}'][data-c='${m.c}']`);if(s){const i=document.createElement('div');i.classList.add(boardState[m.r][m.c]?'valid-capture-indicator':'valid-move-indicator');s.appendChild(i)}})}
    
    // --- ANIMATION ORCHESTRATOR ---
    async function animateAndMakeMove(fromR, fromC, toR, toC) {
        isAnimating = true;
        const fromSquare = document.querySelector(`[data-r='${fromR}'][data-c='${fromC}']`);
        const toSquare = document.querySelector(`[data-r='${toR}'][data-c='${toC}']`);
        const pieceEl = fromSquare.querySelector('.piece');
        
        clearHighlights();
        
        if (!pieceEl) {
            isAnimating = false;
            return;
        }

        const capturedPieceData = boardState[toR][toC];
        const capturedPieceEl = toSquare.querySelector('.piece');

        const moveDuration = await animatePieceMove(pieceEl, fromSquare, toSquare);
        
        if (capturedPieceEl && capturedPieceData) {
             const capturedType = capturedPieceData.piece.split('_')[1];
             const targetContainer = currentPlayer === 'w' ? whiteCapturedEl : blackCapturedEl;
             
             const existingOfType = Array.from(targetContainer.querySelectorAll('.captured-piece'))
                 .filter(p => p.dataset.pieceType === capturedType).length;
             
             let slotIndex = -1;
             let count = 0;
             for (let i = 0; i < CAPTURE_ORDER.length; i++) {
                 if (CAPTURE_ORDER[i] === capturedType) {
                     if (count === existingOfType) {
                         slotIndex = i;
                         break;
                     }
                     count++;
                 }
             }
             
             const targetSlot = targetContainer.children[slotIndex];
             if (targetSlot) {
                 animateSiphon(capturedPieceEl, targetSlot, capturedType);
             }
        }
        
        // Wait for animation to finish before committing the move
        commitMove(fromR, fromC, toR, toC);
    }

    // --- FINAL: CHESS.COM-STYLE ANIMATION USING requestAnimationFrame ---
    function animatePieceMove(pieceEl, fromSquare, toSquare) {
        return new Promise(resolve => {
            const fromRect = fromSquare.getBoundingClientRect();
            const toRect = toSquare.getBoundingClientRect();

            const clone = pieceEl.cloneNode(true);
            clone.classList.add('piece-sliding', 'piece-sliding-glow');
            clone.style.position = 'fixed';
            clone.style.left = `${fromRect.left}px`;
            clone.style.top = `${fromRect.top}px`;
            clone.style.width = `${fromRect.width}px`;
            clone.style.height = `${fromRect.height}px`;
            clone.style.zIndex = '1001';
            
            document.body.appendChild(clone);
            pieceEl.style.visibility = 'hidden';
            
            const deltaX = toRect.left - fromRect.left;
            const deltaY = toRect.top - fromRect.top;
            
            const duration = 150; // A fixed, quick duration for a snappy feel
            let startTime = null;

            function animationStep(timestamp) {
                if (!startTime) startTime = timestamp;
                const progress = Math.min((timestamp - startTime) / duration, 1);

                // Apply the transformation based on progress
                clone.style.transform = `translate(${deltaX * progress}px, ${deltaY * progress}px)`;

                if (progress < 1) {
                    // If the animation is not finished, request the next frame
                    requestAnimationFrame(animationStep);
                } else {
                    // Animation is complete
                    if (clone.parentNode) document.body.removeChild(clone);
                    resolve(duration);
                }
            }
            // Start the animation loop
            requestAnimationFrame(animationStep);
        });
    }
    
    // --- SPECTACULAR SIPHON FUNCTION FOR CAPTURED PIECES ---
    function animateSiphon(pieceEl, targetSlot, pieceType) {
        const pieceRect = pieceEl.getBoundingClientRect();
        const slotRect = targetSlot.getBoundingClientRect();
        
        // Create a clone of the piece for animation
        const clone = pieceEl.cloneNode(true);
        clone.classList.add('piece-siphon-clone');
        document.body.appendChild(clone);
        
        // Position clone exactly over the original piece
        clone.style.cssText = `
            position: fixed;
            left: ${pieceRect.left}px;
            top: ${pieceRect.top}px;
            width: ${pieceRect.width}px;
            height: ${pieceRect.height}px;
            background-image: ${pieceEl.style.backgroundImage};
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            z-index: 10000;
            pointer-events: none;
            transition: all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
        `;
        
        // Add glitch effect to original piece
        pieceEl.classList.add('piece-captured-glitch');
        
        // Calculate animation path with some curve
        setTimeout(() => {
            const deltaX = slotRect.left + slotRect.width / 2 - (pieceRect.left + pieceRect.width / 2);
            const deltaY = slotRect.top + slotRect.height / 2 - (pieceRect.top + pieceRect.height / 2);
            
            clone.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.4)`;
            clone.style.opacity = '0.7';
            clone.style.filter = 'hue-rotate(45deg) brightness(1.5)';
        }, 100);
        
        // Clean up and create the captured piece in the slot
        setTimeout(() => {
            document.body.removeChild(clone);
            
            // Create the captured piece in the slot with materialize effect
            const newPiece = document.createElement('div');
            newPiece.className = 'captured-piece materialize';
            newPiece.style.backgroundImage = pieceEl.style.backgroundImage;
            newPiece.dataset.pieceType = pieceType;
            targetSlot.innerHTML = '';
            targetSlot.appendChild(newPiece);
            
            // Add sparkle effect to the slot
            targetSlot.classList.add('slot-sparkle');
            setTimeout(() => {
                targetSlot.classList.remove('slot-sparkle');
            }, 1000);
            
            // Update captured containers visibility
            updateCapturedContainersVisibility();
            
        }, 900);
    }
    
    function commitMove(fromR,fromC,toR,toC,promotionPiece=null){
        const movingPiece=boardState[fromR][fromC];
        if(movingPiece.piece.endsWith('pawn')&&(toR===0||toR===7)){
            if(!promotionPiece){
                showPromotionDialog(fromR,fromC,toR,toC);
                return;
            }
            movingPiece.piece=`${currentPlayer}_${promotionPiece}`;
        }
        moveHistory.push({
            fromR,fromC,toR,toC,
            movingPiece:JSON.parse(JSON.stringify(movingPiece)),
            capturedPiece:boardState[toR][toC]?JSON.parse(JSON.stringify(boardState[toR][toC])):null,
            prevEnPassantTarget:enPassantTarget
        });
        boardState[toR][toC]=movingPiece;
        boardState[fromR][fromC]=null;
        movingPiece.hasMoved=!0;
        if(movingPiece.piece.endsWith('pawn')&&enPassantTarget&&toR===enPassantTarget.r&&toC===enPassantTarget.c){
            const capR=currentPlayer==='w'?toR+1:toR-1;
            boardState[capR][toC]=null;
        }
        enPassantTarget=movingPiece.piece.endsWith('pawn')&&Math.abs(fromR-toR)===2?{r:(fromR+toR)/2,c:toC}:null;
        if(movingPiece.piece.endsWith('king')&&Math.abs(fromC-toC)===2){
            const rC=toC>fromC?7:0,nRC=toC>fromC?5:3,rk=boardState[fromR][rC];
            boardState[fromR][nRC]=rk;
            boardState[fromR][rC]=null;
            if(rk)rk.hasMoved=!0;
        }
        switchPlayer();
        renderBoard();
        updateStatus();
        undoButton.disabled=!1;
        if(!checkGameOver()){
            if(currentPlayer==='b'){
                setTimeout(makeAIMove,600);
            }else{
                isAnimating=!1;
            }
        }else{
            isAnimating=!1;
        }
    }
    
    function undoMove(){
        if(moveHistory.length===0||isAnimating)return;
        const lastMove=moveHistory.pop();
        const wasCapture=lastMove.capturedPiece;
        boardState[lastMove.fromR][lastMove.fromC]=lastMove.movingPiece;
        boardState[lastMove.toR][lastMove.toC]=lastMove.capturedPiece;
        if(lastMove.movingPiece.piece.endsWith('pawn')&&lastMove.prevEnPassantTarget&&lastMove.toR===lastMove.prevEnPassantTarget.r&&lastMove.toC===lastMove.prevEnPassantTarget.c&&!lastMove.capturedPiece){
            const capturedPawnR=lastMove.toR+(lastMove.movingPiece.piece.startsWith('w')?1:-1);
            const opponentColor=lastMove.movingPiece.piece.startsWith('w')?'b':'w';
            boardState[capturedPawnR][lastMove.toC]={piece:`${opponentColor}_pawn`,hasMoved:!0};
        }
        if(lastMove.movingPiece.piece.endsWith('king')&&Math.abs(lastMove.fromC-lastMove.toC)===2){
            const rookC=lastMove.toC>lastMove.fromC?5:3;
            const originalRookC=lastMove.toC>lastMove.fromC?7:0;
            const rook=boardState[lastMove.fromR][rookC];
            boardState[lastMove.fromR][originalRookC]=rook;
            boardState[lastMove.fromR][rookC]=null;
            if(rook)rook.hasMoved=!1;
        }
        enPassantTarget=lastMove.prevEnPassantTarget;
        switchPlayer();
        if(wasCapture){
            const pieceType=wasCapture.piece.split('_')[1];
            const targetContainer=currentPlayer==='w'?whiteCapturedEl:blackCapturedEl;
            const existingOfType=Array.from(targetContainer.querySelectorAll('.captured-piece')).filter(p=>p.dataset.pieceType===pieceType);
            if(existingOfType.length>0){
                existingOfType[existingOfType.length-1].parentElement.innerHTML='';
            }
            // Update captured containers visibility after undo
            updateCapturedContainersVisibility();
        }
        renderBoard();
        updateStatus();
        isGameOver=!1;
        gameOverModal.classList.add('hidden');
        if(moveHistory.length===0)undoButton.disabled=!0;
    }

    function switchPlayer(){currentPlayer=currentPlayer==='w'?'b':'w'}
    function updateStatus(){let s=`${currentPlayer==='w'?'You':'AI'} to Move`;if(isKingInCheck(currentPlayer)){s=`CHECK! ${s}`}gameStatusEl.textContent=s}
    
    function showPromotionDialog(fR,fC,tR,tC){promotionChoicesEl.innerHTML='';const cs=['queen','rook','bishop','knight'];cs.forEach(pT=>{const cE=document.createElement('div');cE.classList.add('promotion-piece');cE.style.backgroundImage=`url('${PIECE_SVGS[`${currentPlayer}_${pT}`]}')`;cE.dataset.piece=pT;cE.onclick=()=>{promotionModal.classList.add('hidden');commitMove(fR,fC,tR,tC,pT)};promotionChoicesEl.appendChild(cE)});promotionModal.classList.remove('hidden')}
    
    function checkGameOver(){if(getAllValidMoves(currentPlayer).length>0)return!1;isGameOver=!0;const winner=currentPlayer==='w'?'AI':'You';if(isKingInCheck(currentPlayer)){gameOverMessageEl.textContent=`Checkmate! ${winner} win${winner==='You'?'':'s'}.`;const kingPos=findKing(currentPlayer),kingEl=document.querySelector(`[data-r='${kingPos.r}'][data-c='${kingPos.c}'] .piece`),targetContainer=winner==='You'?whiteCapturedEl:blackCapturedEl,kingSlot=targetContainer.querySelector('.king-slot');if(kingEl&&kingSlot)animateSiphon(kingEl,kingSlot,'king');setTimeout(()=>gameOverModal.classList.remove('hidden'),800)}else{gameOverMessageEl.textContent="Stalemate! It's a draw.";gameOverModal.classList.remove('hidden')}return!0}

    // --- UPDATE CAPTURED CONTAINERS VISIBILITY ---
    function updateCapturedContainersVisibility() {
        const whiteContainer = whiteCapturedEl.parentElement;
        const blackContainer = blackCapturedEl.parentElement;
        
        const whiteHasCaptured = whiteCapturedEl.querySelectorAll('.captured-piece').length > 0;
        const blackHasCaptured = blackCapturedEl.querySelectorAll('.captured-piece').length > 0;
        
        // On mobile, hide empty containers completely
        if (window.innerWidth <= 900) {
            if (whiteHasCaptured) {
                whiteContainer.classList.remove('hidden-on-mobile');
                whiteContainer.classList.add('has-captured-pieces');
            } else {
                whiteContainer.classList.add('hidden-on-mobile');
                whiteContainer.classList.remove('has-captured-pieces');
            }
            
            if (blackHasCaptured) {
                blackContainer.classList.remove('hidden-on-mobile');
                blackContainer.classList.add('has-captured-pieces');
            } else {
                blackContainer.classList.add('hidden-on-mobile');
                blackContainer.classList.remove('has-captured-pieces');
            }
        } else {
            // On desktop, always show containers but style empty ones differently
            whiteContainer.classList.remove('hidden-on-mobile');
            blackContainer.classList.remove('hidden-on-mobile');
            
            if (whiteHasCaptured) {
                whiteContainer.classList.add('has-captured-pieces');
            } else {
                whiteContainer.classList.remove('has-captured-pieces');
            }
            
            if (blackHasCaptured) {
                blackContainer.classList.add('has-captured-pieces');
            } else {
                blackContainer.classList.remove('has-captured-pieces');
            }
        }
    }

    const AI_SMARTNESS_LEVEL=.7,pieceValues={pawn:10,knight:30,bishop:30,rook:50,queen:90,king:900};
    function makeAIMove(){const aLM=getAllValidMoves('b');if(aLM.length===0)return;let cM;if(Math.random()<AI_SMARTNESS_LEVEL){cM=findBestMove(aLM)}else{cM=aLM[Math.floor(Math.random()*aLM.length)]}if(cM)animateAndMakeMove(cM.fromR,cM.fromC,cM.toR,cM.toC)}
    function findBestMove(moves){let bestScore=-Infinity,bestMove=null;for(const move of moves){const movingPiece=boardState[move.fromR][move.fromC],capturedPiece=boardState[move.toR][move.toC];boardState[move.toR][move.toC]=movingPiece;boardState[move.fromR][move.fromC]=null;let score=minimax(2,-Infinity,Infinity,!1);boardState[move.fromR][move.fromC]=movingPiece;boardState[move.toR][move.toC]=capturedPiece;if(score>bestScore){bestScore=score;bestMove=move}}return bestMove}
    function minimax(depth,alpha,beta,isMaximizingPlayer){if(depth===0)return-evaluateBoard();const moves=getAllValidMoves(isMaximizingPlayer?'b':'w');if(isMaximizingPlayer){let maxEval=-Infinity;for(const move of moves){const movingPiece=boardState[move.fromR][move.fromC],capturedPiece=boardState[move.toR][move.toC];boardState[move.toR][move.toC]=movingPiece;boardState[move.fromR][move.fromC]=null;let boardEval=minimax(depth-1,alpha,beta,!1);boardState[move.fromR][move.fromC]=movingPiece;boardState[move.toR][move.toC]=capturedPiece;maxEval=Math.max(maxEval,boardEval);alpha=Math.max(alpha,boardEval);if(beta<=alpha)break}return maxEval}else{let minEval=Infinity;for(const move of moves){const movingPiece=boardState[move.fromR][move.fromC],capturedPiece=boardState[move.toR][move.toC];boardState[move.toR][move.toC]=movingPiece;boardState[move.fromR][move.fromC]=null;let boardEval=minimax(depth-1,alpha,beta,!0);boardState[move.fromR][move.fromC]=movingPiece;boardState[move.toR][move.toC]=capturedPiece;minEval=Math.min(minEval,boardEval);beta=Math.min(beta,boardEval);if(beta<=alpha)break}return minEval}}
    function evaluateBoard(){let total=0;for(let r=0;r<8;r++){for(let c=0;c<8;c++){if(boardState[r][c]){const p=boardState[r][c].piece,v=pieceValues[p.split('_')[1]]||0;total+=p.startsWith('w')?v:-v}}}return total}
    function getValidMovesForPiece(r,c){const pD=boardState[r][c];if(!pD)return[];const p=pD.piece,co=p[0];let m=[];if(p.endsWith('pawn'))m=getPawnMoves(r,c,co);else if(p.endsWith('rook'))m=getSlidingMoves(r,c,[[0,1],[0,-1],[1,0],[-1,0]]);else if(p.endsWith('knight'))m=getKnightMoves(r,c);else if(p.endsWith('bishop'))m=getSlidingMoves(r,c,[[1,1],[1,-1],[-1,1],[-1,-1]]);else if(p.endsWith('queen'))m=getSlidingMoves(r,c,[[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]);else if(p.endsWith('king'))m=getKingMoves(r,c);return m.filter(mo=>!moveLeavesKingInCheck(r,c,mo.r,mo.c))}
    function getAllValidMoves(co){let aM=[];for(let r=0;r<8;r++){for(let c=0;c<8;c++){const pD=boardState[r][c];if(pD&&pD.piece.startsWith(co))aM.push(...getValidMovesForPiece(r,c).map(m=>({fromR:r,fromC:c,toR:m.r,toC:m.c})))}}return aM}
    function getPawnMoves(r,c,co){const m=[],d=co==='w'?-1:1,sR=co==='w'?6:1;if(isValid(r+d,c)&&!boardState[r+d][c]){m.push({r:r+d,c});if(r===sR&&isValid(r+2*d,c)&&!boardState[r+2*d][c])m.push({r:r+2*d,c})}for(let dC of[-1,1]){if(isValid(r+d,c+dC)){const t=boardState[r+d][c+dC];if(t&&!t.piece.startsWith(co))m.push({r:r+d,c:c+dC});if(enPassantTarget&&enPassantTarget.r===r+d&&enPassantTarget.c===c+dC)m.push({r:r+d,c:c+dC})}}return m}
    function getKnightMoves(r,c){const m=[],o=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];o.forEach(([dR,dC])=>addMoveIfValid(m,r,c,r+dR,dC));return m}
    function getKingMoves(r,c){const m=[],o=kD=boardState[r][c],oC=kD.piece.startsWith('w')?'b':'w';for(let dR=-1;dR<=1;dR++){for(let dC=-1;dC<=1;dC++){if(dR===0&&dC===0)continue;addMoveIfValid(m,r,c,r+dR,dC)}}if(!kD.hasMoved&&!isSquareUnderAttack(r,c,oC)){const rK=boardState[r][7];if(rK&&!rK.hasMoved&&!boardState[r][5]&&!boardState[r][6]&&!isSquareUnderAttack(r,5,oC)&&!isSquareUnderAttack(r,6,oC))m.push({r,c:6});const rQ=boardState[r][0];if(rQ&&!rQ.hasMoved&&!boardState[r][1]&&!boardState[r][2]&&!boardState[r][3]&&!isSquareUnderAttack(r,2,oC)&&!isSquareUnderAttack(r,3,oC))m.push({r,c:2})}return m}
    function getSlidingMoves(r,c,dirs){const m=[],co=boardState[r][c].piece[0];dirs.forEach(([dR,dC])=>{let cR=r+dR,cC=c+dC;while(isValid(cR,cC)){const t=boardState[cR][cC];if(t){if(!t.piece.startsWith(co))m.push({r:cR,c:cC});break}m.push({r:cR,c:cC});cR+=dR;cC+=dC}});return m}
    function addMoveIfValid(m,fR,fC,tR,tC){if(!isValid(tR,tC))return;const t=boardState[tR][tC];if(!t||!t.piece.startsWith(boardState[fR][fC].piece[0]))m.push({r:tR,c:tC})}
    function moveLeavesKingInCheck(fR,fC,tR,tC){const co=boardState[fR][fC].piece[0],oP=boardState[tR][tC],mP=boardState[fR][fC];boardState[tR][tC]=mP;boardState[fR][fC]=null;let ePC=null;if(mP.piece.endsWith('pawn')&&enPassantTarget&&tR===enPassantTarget.r&&tC===enPassantTarget.c){const cPR=co==='w'?tR+1:tR-1;ePC=boardState[cPR][tC];boardState[cPR][tC]=null}const iC=isKingInCheck(co);boardState[fR][fC]=mP;boardState[tR][tC]=oP;if(ePC){const cPR=co==='w'?tR+1:tR-1;boardState[cPR][tC]=ePC}return iC}
    function isKingInCheck(kC){const kP=findKing(kC);if(!kP)return!0;const oC=kC==='w'?'b':'w';return isSquareUnderAttack(kP.r,kP.c,oC)}
    function findKing(co){for(let r=0;r<8;r++){for(let c=0;c<8;c++){if(boardState[r][c]&&boardState[r][c].piece===`${co}_king`)return{r,c}}}return null}
    function isSquareUnderAttack(r,c,aC){for(let ro=0;ro<8;ro++){for(let co=0;co<8;co++){const pD=boardState[ro][co];if(pD&&pD.piece.startsWith(aC)){const p=pD.piece;let rM=[];if(p.endsWith('pawn')){const d=aC==='w'?-1:1;if(isValid(ro+d,co-1))rM.push({r:ro+d,c:co-1});if(isValid(ro+d,co+1))rM.push({r:ro+d,c:co+1})}else if(p.endsWith('rook'))rM=getSlidingMoves(ro,co,[[0,1],[0,-1],[1,0],[-1,0]]);else if(p.endsWith('knight'))rM=getKnightMoves(ro,co);else if(p.endsWith('bishop'))rM=getSlidingMoves(ro,co,[[1,1],[1,-1],[-1,1],[-1,-1]]);else if(p.endsWith('queen'))rM=getSlidingMoves(ro,co,[[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]);else if(p.endsWith('king')){for(let dR=-1;dR<=1;dR++){for(let dC=-1;dC<=1;dC++){if(dR===0&&dC===0)continue;if(isValid(ro+dR,co+dC))rM.push({r:ro+dR,c:co+dC})}}}if(rM.some(m=>m.r===r&&m.c===c))return!0}}}return!1}
    function isValid(r,c){return r>=0&&r<8&&c>=0&&c<8}

    // Add resize listener to update captured containers visibility
    window.addEventListener('resize', updateCapturedContainersVisibility);

    grid.addEventListener('click',handleSquareClick);
    newGameButton.addEventListener('click',initializeGame);
    undoButton.addEventListener('click',undoMove);
    playAgainButton.addEventListener('click',initializeGame);
    initializeGame();
});

