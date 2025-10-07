document.addEventListener('DOMContentLoaded', () => {

    const PIECE_SVGS={'w_pawn':'img/pawn-w.svg','b_pawn':'img/pawn-b.svg','w_rook':'img/rook-w.svg','b_rook':'img/rook-b.svg','w_knight':'img/knight-w.svg','b_knight':'img/knight-b.svg','w_bishop':'img/bishop-w.svg','b_bishop':'img/bishop-b.svg','w_queen':'img/queen-w.svg','b_queen':'img/queen-b.svg','w_king':'img/king-w.svg','b_king':'img/king-b.svg'};
    const grid=document.getElementById('chess-grid'),gameStatusEl=document.querySelector('#game-status span'),whiteCapturedEl=document.querySelector('#white-captured .captured-pieces'),blackCapturedEl=document.querySelector('#black-captured .captured-pieces'),newGameButton=document.getElementById('new-game-button'),undoButton=document.getElementById('undo-button'),promotionModal=document.getElementById('promotion-modal'),promotionChoicesEl=document.getElementById('promotion-choices'),gameOverModal=document.getElementById('game-over-modal'),gameOverMessageEl=document.getElementById('game-over-message'),playAgainButton=document.getElementById('play-again-button');
    let boardState,currentPlayer,selectedSquare,validMoves,moveHistory,enPassantTarget,isGameOver,isAnimating=!1;

    function initializeGame(){boardState=createInitialBoard();currentPlayer='w';selectedSquare=null;validMoves=[];moveHistory=[];enPassantTarget=null;isGameOver=!1;isAnimating=!1;whiteCapturedEl.innerHTML = ''; blackCapturedEl.innerHTML = ''; renderBoard();updateStatus();undoButton.disabled=!0;gameOverModal.classList.add('hidden')}
    function createInitialBoard(){const b=Array(8).fill(null).map(()=>Array(8).fill(null));const p=(pc,r,c)=>{b[r][c]={piece:pc,hasMoved:!1}};for(let c=0;c<8;c++){p('w_pawn',6,c);p('b_pawn',1,c)}const br=['rook','knight','bishop','queen','king','bishop','knight','rook'];for(let c=0;c<8;c++){p(`w_${br[c]}`,7,c);p(`b_${br[c]}`,0,c)}return b}
    
    function renderBoard(){grid.innerHTML='';let kingInCheckPos=isKingInCheck(currentPlayer)?findKing(currentPlayer):null;for(let r=0;r<8;r++){for(let c=0;c<8;c++){const s=document.createElement('div');s.classList.add('square',(r+c)%2===0?'light':'dark');s.dataset.r=r;s.dataset.c=c;const pD=boardState[r][c];if(pD){const pE=document.createElement('div');pE.classList.add('piece');pE.style.backgroundImage=`url('${PIECE_SVGS[pD.piece]}')`;s.appendChild(pE)}if(kingInCheckPos&&kingInCheckPos.r===r&&kingInCheckPos.c===c){s.classList.add('in-check')}grid.appendChild(s)}}}
    
    function handleSquareClick(e){if(isGameOver||isAnimating||currentPlayer==='b')return;const s=e.target.closest('.square');if(!s)return;const r=parseInt(s.dataset.r),c=parseInt(s.dataset.c),pD=boardState[r][c];if(selectedSquare){if(validMoves.some(m=>m.r===r&&m.c===c)){animateAndMakeMove(selectedSquare.r,selectedSquare.c,r,c)}else{clearHighlights();if(pD&&pD.piece.startsWith(currentPlayer))selectPiece(r,c)}}else if(pD&&pD.piece.startsWith(currentPlayer))selectPiece(r,c)}
    
    function selectPiece(r,c){clearHighlights();selectedSquare={r,c};document.querySelector(`[data-r='${r}'][data-c='${c}']`).classList.add('selected');validMoves=getValidMovesForPiece(r,c);highlightValidMoves()}
    function clearHighlights(){selectedSquare=null;validMoves=[];document.querySelectorAll('.square.selected').forEach(s=>s.classList.remove('selected'));document.querySelectorAll('.valid-move-indicator, .valid-capture-indicator').forEach(i=>i.remove())}
    function highlightValidMoves(){validMoves.forEach(m=>{const s=document.querySelector(`[data-r='${m.r}'][data-c='${m.c}']`);if(s){const i=document.createElement('div');i.classList.add(boardState[m.r][m.c]?'valid-capture-indicator':'valid-move-indicator');s.appendChild(i)}})}
    function generateLightningPath(x1,y1,x2,y2){const p=[[x1,y1]],dX=x2-x1,dY=y2-y1,dist=Math.hypot(dX,dY),segs=Math.max(5,Math.floor(dist/30)),variance=20;for(let i=1;i<segs;i++){const t=i/segs,nX=x1+dX*t,nY=y1+dY*t,rO=(Math.random()-.5)*variance*(1-Math.abs(i-segs/2)/(segs/2)),pX=-dY/dist,pY=dX/dist;p.push([nX+pX*rO,nY+pY*rO])}p.push([x2,y2]);return p.map(pt=>pt.join(',')).join(' ')}
    
    function animateAndMakeMove(fromR, fromC, toR, toC) {
        isAnimating = true;
        const fromSquare = document.querySelector(`[data-r='${fromR}'][data-c='${fromC}']`);
        const toSquare = document.querySelector(`[data-r='${toR}'][data-c='${toC}']`);
        const pieceEl = fromSquare.querySelector('.piece');
        
        clearHighlights();
        if (!pieceEl) { isAnimating = false; return; }

        const capturedPieceData = boardState[toR][toC];
        const capturedPieceEl = toSquare.querySelector('.piece');
        if (capturedPieceEl) {
            capturedPieceEl.classList.add('piece-captured-glitch');
        }
        
        pieceEl.classList.add('piece-fade-out');

        const gridRect = grid.getBoundingClientRect();
        const fromRect = fromSquare.getBoundingClientRect();
        const toRect = toSquare.getBoundingClientRect();
        const startX = fromRect.left - gridRect.left + fromRect.width / 2;
        const startY = fromRect.top - gridRect.top + fromRect.height / 2;
        const endX = toRect.left - gridRect.left + toRect.width / 2;
        const endY = toRect.top - gridRect.top + toRect.height / 2;
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('lightning-overlay');
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.classList.add('lightning-path');
        polyline.setAttribute('points', generateLightningPath(startX, startY, endX, endY));
        svg.appendChild(polyline);
        grid.appendChild(svg);
        const length = polyline.getTotalLength();
        polyline.style.setProperty('--stroke-length', length);
        polyline.style.strokeDasharray = length;

        setTimeout(() => {
            if (capturedPieceData) {
                updateCapturedPieces(capturedPieceData.piece);
            }
            commitMove(fromR, fromC, toR, toC);
            const newPieceEl = toSquare.querySelector('.piece');
            if (newPieceEl) newPieceEl.classList.add('piece-fade-in');
            toSquare.classList.add('square-landing-effect');

            setTimeout(() => {
                toSquare.classList.remove('square-landing-effect');
                grid.removeChild(svg);
            }, 500);

        }, 200);
    }

    function commitMove(fromR,fromC,toR,toC,promotionPiece=null){const movingPiece=boardState[fromR][fromC];if(movingPiece.piece.endsWith('pawn')&&(toR===0||toR===7)){if(!promotionPiece){showPromotionDialog(fromR,fromC,toR,toC);return}movingPiece.piece=`${currentPlayer}_${promotionPiece}`}moveHistory.push({fromR,fromC,toR,toC,movingPiece:JSON.parse(JSON.stringify(movingPiece)),capturedPiece:boardState[toR][toC]?JSON.parse(JSON.stringify(boardState[toR][toC])):null,prevEnPassantTarget:enPassantTarget});boardState[toR][toC]=movingPiece;boardState[fromR][fromC]=null;movingPiece.hasMoved=!0;if(movingPiece.piece.endsWith('pawn')&&enPassantTarget&&toR===enPassantTarget.r&&toC===enPassantTarget.c){const capR=currentPlayer==='w'?toR+1:toR-1;boardState[capR][toC]=null}enPassantTarget=movingPiece.piece.endsWith('pawn')&&Math.abs(fromR-toR)===2?{r:(fromR+toR)/2,c:toC}:null;if(movingPiece.piece.endsWith('king')&&Math.abs(fromC-toC)===2){const rC=toC>fromC?7:0,nRC=toC>fromC?5:3,rk=boardState[fromR][rC];boardState[fromR][nRC]=rk;boardState[fromR][rC]=null;if(rk)rk.hasMoved=!0}switchPlayer();renderBoard();updateStatus();undoButton.disabled=!1;if(checkGameOver()){isAnimating=!1}else if(currentPlayer==='b'){setTimeout(makeAIMove,600)}else{isAnimating=!1}}
    function undoMove(){if(moveHistory.length===0||isAnimating)return;initializeGame();/* Simplest way to handle complex undo */}
    function switchPlayer(){currentPlayer=currentPlayer==='w'?'b':'w'}
    function updateStatus(){let s=`${currentPlayer==='w'?'White':'AI'} to Move`;if(isKingInCheck(currentPlayer)){s=`CHECK! ${currentPlayer==='w'?'White':'AI'} to Move`}gameStatusEl.textContent=s}

    // --- REWRITTEN "SMART" CAPTURE UI UPDATE ---
    function updateCapturedPieces(newlyCapturedPiece) {
        if (!newlyCapturedPiece) return;

        const [color, type] = newlyCapturedPiece.split('_');
        const targetContainer = color === 'b' ? whiteCapturedEl : blackCapturedEl;
        
        addCapturedPieceToUI(targetContainer, newlyCapturedPiece);
    }

    function addCapturedPieceToUI(container, piece) {
        if (!PIECE_SVGS[piece]) return;
        const pieceEl = document.createElement('div');
        pieceEl.classList.add('captured-piece', 'captured-piece--entering');
        pieceEl.style.backgroundImage = `url('${PIECE_SVGS[piece]}')`;
        
        // Randomize position and animation for a natural floating look
        const containerRect = container.getBoundingClientRect();
        const pieceSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-size')) * 0.5;
        pieceEl.style.top = `${Math.random() * (containerRect.height - pieceSize)}px`;
        pieceEl.style.left = `${Math.random() * (containerRect.width - pieceSize)}px`;
        
        // Random drift animation properties
        pieceEl.style.setProperty('--tx1', `${(Math.random() - 0.5) * 20}px`);
        pieceEl.style.setProperty('--ty1', `${(Math.random() - 0.5) * 20}px`);
        pieceEl.style.setProperty('--tx2', `${(Math.random() - 0.5) * 20}px`);
        pieceEl.style.setProperty('--ty2', `${(Math.random() - 0.5) * 20}px`);
        pieceEl.style.setProperty('--r1', `${(Math.random() - 0.5) * 30}deg`);
        pieceEl.style.setProperty('--r2', `${(Math.random() - 0.5) * 30}deg`);
        pieceEl.style.animationDuration = `${10 + Math.random() * 5}s`;

        container.appendChild(pieceEl);
    }

    function showPromotionDialog(fR,fC,tR,tC){promotionChoicesEl.innerHTML='';const cs=['queen','rook','bishop','knight'];cs.forEach(pT=>{const cE=document.createElement('div');cE.classList.add('promotion-piece');cE.style.backgroundImage=`url('${PIECE_SVGS[`${currentPlayer}_${pT}`]}')`;cE.dataset.piece=pT;cE.onclick=()=>{promotionModal.classList.add('hidden');commitMove(fR,fC,tR,tC,pT)};promotionChoicesEl.appendChild(cE)});promotionModal.classList.remove('hidden')}
    function checkGameOver(){if(getAllValidMoves(currentPlayer).length===0){isGameOver=!0;gameOverMessageEl.textContent=isKingInCheck(currentPlayer)?`Checkmate! ${currentPlayer==='w'?'AI':'You'} win${currentPlayer==='w'?'s':''}.`:`Stalemate! It's a draw.`;gameOverModal.classList.remove('hidden');return!0}return!1}
    const AI_SMARTNESS_LEVEL=.7,pieceValues={pawn:10,knight:30,bishop:30,rook:50,queen:90,king:900};
    function makeAIMove(){const aLM=getAllValidMoves('b');if(aLM.length===0)return;let cM;if(Math.random()<AI_SMARTNESS_LEVEL){cM=findBestMove(aLM)}else{cM=aLM[Math.floor(Math.random()*aLM.length)]}if(cM)animateAndMakeMove(cM.fromR,cM.fromC,cM.toR,cM.toC)}
    function findBestMove(moves){let bestScore=-Infinity,bestMove=null;for(const move of moves){const movingPiece=boardState[move.fromR][move.fromC],capturedPiece=boardState[move.toR][move.toC];boardState[move.toR][move.toC]=movingPiece;boardState[move.fromR][move.fromC]=null;let score=minimax(2,-Infinity,Infinity,!1);boardState[move.fromR][move.fromC]=movingPiece;boardState[move.toR][move.toC]=capturedPiece;if(score>bestScore){bestScore=score;bestMove=move}}return bestMove}
    function minimax(depth,alpha,beta,isMaximizingPlayer){if(depth===0)return-evaluateBoard();const moves=getAllValidMoves(isMaximizingPlayer?'b':'w');if(isMaximizingPlayer){let maxEval=-Infinity;for(const move of moves){const movingPiece=boardState[move.fromR][move.fromC],capturedPiece=boardState[move.toR][move.toC];boardState[move.toR][move.toC]=movingPiece;boardState[move.fromR][move.fromC]=null;let boardEval=minimax(depth-1,alpha,beta,!1);boardState[move.fromR][move.fromC]=movingPiece;boardState[move.toR][move.toC]=capturedPiece;maxEval=Math.max(maxEval,boardEval);alpha=Math.max(alpha,boardEval);if(beta<=alpha)break}return maxEval}else{let minEval=Infinity;for(const move of moves){const movingPiece=boardState[move.fromR][move.fromC],capturedPiece=boardState[move.toR][move.toC];boardState[move.toR][move.toC]=movingPiece;boardState[move.fromR][move.fromC]=null;let boardEval=minimax(depth-1,alpha,beta,!0);boardState[move.fromR][move.fromC]=movingPiece;boardState[move.toR][move.toC]=capturedPiece;minEval=Math.min(minEval,boardEval);beta=Math.min(beta,boardEval);if(beta<=alpha)break}return minEval}}
    function evaluateBoard(){let total=0;for(let r=0;r<8;r++){for(let c=0;c<8;c++){if(boardState[r][c]){const p=boardState[r][c].piece,v=pieceValues[p.split('_')[1]]||0;total+=p.startsWith('w')?v:-v}}}return total}
    function getValidMovesForPiece(r,c){const pD=boardState[r][c];if(!pD)return[];const p=pD.piece,co=p[0];let m=[];if(p.endsWith('pawn'))m=getPawnMoves(r,c,co);else if(p.endsWith('rook'))m=getSlidingMoves(r,c,[[0,1],[0,-1],[1,0],[-1,0]]);else if(p.endsWith('knight'))m=getKnightMoves(r,c);else if(p.endsWith('bishop'))m=getSlidingMoves(r,c,[[1,1],[1,-1],[-1,1],[-1,-1]]);else if(p.endsWith('queen'))m=getSlidingMoves(r,c,[[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]);else if(p.endsWith('king'))m=getKingMoves(r,c);return m.filter(mo=>!moveLeavesKingInCheck(r,c,mo.r,mo.c))}
    function getAllValidMoves(co){let aM=[];for(let r=0;r<8;r++){for(let c=0;c<8;c++){const pD=boardState[r][c];if(pD&&pD.piece.startsWith(co))aM.push(...getValidMovesForPiece(r,c).map(m=>({fromR:r,fromC:c,toR:m.r,toC:m.c})))}}return aM}
    function getPawnMoves(r,c,co){const m=[],d=co==='w'?-1:1,sR=co==='w'?6:1;if(isValid(r+d,c)&&!boardState[r+d][c]){m.push({r:r+d,c});if(r===sR&&isValid(r+2*d,c)&&!boardState[r+2*d][c])m.push({r:r+2*d,c})}for(let dC of[-1,1]){if(isValid(r+d,c+dC)){const t=boardState[r+d][c+dC];if(t&&!t.piece.startsWith(co))m.push({r:r+d,c:c+dC});if(enPassantTarget&&enPassantTarget.r===r+d&&enPassantTarget.c===c+dC)m.push({r:r+d,c:c+dC})}}return m}
    function getKnightMoves(r,c){const m=[],o=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];o.forEach(([dR,dC])=>addMoveIfValid(m,r,c,r+dR,dC));return m}
    function getKingMoves(r,c){const m=[];for(let dR=-1;dR<=1;dR++){for(let dC=-1;dC<=1;dC++){if(dR===0&&dC===0)continue;addMoveIfValid(m,r,c,r+dR,dC)}}const kD=boardState[r][c],oC=kD.piece.startsWith('w')?'b':'w';if(!kD.hasMoved&&!isSquareUnderAttack(r,c,oC)){const rK=boardState[r][7];if(rK&&!rK.hasMoved&&!boardState[r][5]&&!boardState[r][6]&&!isSquareUnderAttack(r,5,oC)&&!isSquareUnderAttack(r,6,oC))m.push({r,c:6});const rQ=boardState[r][0];if(rQ&&!rQ.hasMoved&&!boardState[r][1]&&!boardState[r][2]&&!boardState[r][3]&&!isSquareUnderAttack(r,2,oC)&&!isSquareUnderAttack(r,3,oC))m.push({r,c:2})}return m}
    function getSlidingMoves(r,c,dirs){const m=[],co=boardState[r][c].piece[0];dirs.forEach(([dR,dC])=>{let cR=r+dR,cC=c+dC;while(isValid(cR,cC)){const t=boardState[cR][cC];if(t){if(!t.piece.startsWith(co))m.push({r:cR,c:cC});break}m.push({r:cR,c:cC});cR+=dR;cC+=dC}});return m}
    function addMoveIfValid(m,fR,fC,tR,tC){if(!isValid(tR,tC))return;const t=boardState[tR][tC];if(!t||!t.piece.startsWith(boardState[fR][fC].piece[0]))m.push({r:tR,c:tC})}
    function moveLeavesKingInCheck(fR,fC,tR,tC){const co=boardState[fR][fC].piece[0],oP=boardState[tR][tC],mP=boardState[fR][fC];boardState[tR][tC]=mP;boardState[fR][fC]=null;let ePC=null;if(mP.piece.endsWith('pawn')&&enPassantTarget&&tR===enPassantTarget.r&&tC===enPassantTarget.c){const cPR=co==='w'?tR+1:tR-1;ePC=boardState[cPR][tC];boardState[cPR][tC]=null}const iC=isKingInCheck(co);boardState[fR][fC]=mP;boardState[tR][tC]=oP;if(ePC){const cPR=co==='w'?tR+1:tR-1;boardState[cPR][tC]=ePC}return iC}
    function isKingInCheck(kC){const kP=findKing(kC);if(!kP)return!0;const oC=kC==='w'?'b':'w';return isSquareUnderAttack(kP.r,kP.c,oC)}
    function findKing(co){for(let r=0;r<8;r++){for(let c=0;c<8;c++){if(boardState[r][c]&&boardState[r][c].piece===`${co}_king`)return{r,c}}}return null}
    function isSquareUnderAttack(r,c,aC){for(let ro=0;ro<8;ro++){for(let co=0;co<8;co++){const pD=boardState[ro][co];if(pD&&pD.piece.startsWith(aC)){const p=pD.piece;let rM=[];if(p.endsWith('pawn')){const d=aC==='w'?-1:1;if(isValid(ro+d,co-1))rM.push({r:ro+d,c:co-1});if(isValid(ro+d,co+1))rM.push({r:ro+d,c:co+1})}else if(p.endsWith('rook'))rM=getSlidingMoves(ro,co,[[0,1],[0,-1],[1,0],[-1,0]]);else if(p.endsWith('knight'))rM=getKnightMoves(ro,co);else if(p.endsWith('bishop'))rM=getSlidingMoves(ro,co,[[1,1],[1,-1],[-1,1],[-1,-1]]);else if(p.endsWith('queen'))rM=getSlidingMoves(ro,co,[[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]);else if(p.endsWith('king')){for(let dR=-1;dR<=1;dR++){for(let dC=-1;dC<=1;dC++){if(dR===0&&dC===0)continue;if(isValid(ro+dR,co+dC))rM.push({r:ro+dR,c:co+dC})}}}if(rM.some(m=>m.r===r&&m.c===c))return!0}}}return!1}
    function isValid(r,c){return r>=0&&r<8&&c>=0&&c<8}

    grid.addEventListener('click',handleSquareClick);
    newGameButton.addEventListener('click',initializeGame);
    undoButton.addEventListener('click',undoMove);
    playAgainButton.addEventListener('click',initializeGame);
    initializeGame();
});