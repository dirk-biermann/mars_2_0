Number.prototype.pix = function(dim) {
  dim = (typeof(dim)==='number'?dim:16);
  return Math.round(this * dim)
}
Number.prototype.rnd = function() {
  return Math.floor( Math.random() * this);
}
Number.prototype.px = function() {
  return (this + "px");
}

window.onload = function() {
    let newMars = new Mars( "game-board", 110, 50, 0 ); 

    document.addEventListener('keydown', ev => { return newMars.onKey(ev, ev.keyCode, true); }, false );
    document.addEventListener('keyup',  ev => { return newMars.onKey(ev, ev.keyCode, false); }, false );

};

// -------------------------------------------------------------------
// CLASS | generic canvas game
// -------------------------------------------------------------------
class CanvasGame {
    constructor(container, width, height) {
        this.width = width;
        this.height = height;
        this.container = container;
        
        this.setDimension();

        this.canvasObstacles = this.createCanvas(1);
        this.canvasTrack = this.createCanvas(2);
        this.canvasPlayer = this.createCanvas(3);
        this.canvasGame = this.createCanvas(4);
    }
    
    setDimension(){
        let objContainer = document.getElementById(this.container);
        objContainer.style.width = (this.width).px();
        objContainer.style.height = (this.height).px();
    }

    createCanvas(container, index){
        let objCanvas = { canvas: document.createElement("canvas"), width: this.width, height: this.height };
        objCanvas.canvas.width = this.width;
        objCanvas.canvas.height = this.height;
        objCanvas.canvas.style.zIndex = index;
        objCanvas.ctx = objCanvas.canvas.getContext("2d");
        document.getElementById(this.container).appendChild(objCanvas.canvas);
        return objCanvas;
    }
}

class Mars extends CanvasGame {
    constructor(container, xDim, yDim){
        super(container, (xDim).pix(), (yDim).pix());

        this.KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, PAUSE: 32, GEAR_1: 49, GEAR_2: 50, GEAR_3: 51 };
        this.CAMPPLANS = [
            [ 0,12, 1, 6,   13, 5, 2, 1,    3,14,12,11,   20, 0,20, 3],
            [20, 1, 9, 0,   20, 5, 2, 1,    3,14,12,11,   20, 0,20, 3],
            [20, 5, 0, 0,    3, 1,20,13,   20,10, 2, 0,    1, 1,20, 3]
        ];
        this.xDim = xDim;
        this.yDim = yDim;
        this.timeFrameMSec = 30;
        this.interval;
        this.images = { imgObstacle: new Image(), imgRover: new Image(), imgTrack: new Image(), imgCampBar: new Image(), imgCamp: new Image() };
        this.obstacles = [];
        this.rovers = [];
        this.camps = [];
        this.createCamps(3);
        this.createObstacles(300);
        this.createRovers(100);
        this.createPlayer();
        this.loadObstacleImage();

        this.roverWait = 3;
        this.maxRoverLoop = 25;
    }

    onKey(ev, key, pressed) {
        if( !pressed ) return;
        switch(parseInt(key)) {
            case this.KEY.LEFT:  
                this.rovers[0].paused = false; this.rovers[0].setDir(3); break;
            case this.KEY.RIGHT:
                this.rovers[0].paused = false; this.rovers[0].setDir(1); break;
            case this.KEY.UP:    
                this.rovers[0].paused = false; this.rovers[0].setDir(0); break;
            case this.KEY.DOWN:  
                this.rovers[0].paused = false; this.rovers[0].setDir(2); break;
            case this.KEY.GEAR_1:  
            case this.KEY.GEAR_2:  
            case this.KEY.GEAR_3:  
                this.rovers[0].setGear(parseInt(key+1) - this.KEY.GEAR_1); break;
            case this.KEY.PAUSE:  
                this.rovers[0].toggleSpeed(); break;
            default: return;
        }
        if( ev !== null ) { ev.preventDefault(); }
    }

    loadObstacleImage() {
        this.images.imgObstacle.src = "./images/obstacle.png";
        this.images.imgObstacle.onload = () => { this.loadCampBarImage(); };
    }
    
    loadCampBarImage() {
        this.images.imgCampBar.src = "./images/camp_bar.png";
        this.images.imgCampBar.onload = () => { this.loadCampImage(); };
    }

    loadCampImage() {
        this.images.imgCamp.src = "./images/camp.png";
        this.images.imgCamp.onload = () => { this.loadTrackImage(); };
    }

    loadTrackImage() {
        this.images.imgTrack.src = "./images/track.png";
        this.images.imgTrack.onload = () => { this.loadRoverImage(); };
    }
    
    loadRoverImage() {
        this.images.imgRover.src = "./images/rover.png";
        this.images.imgRover.onload = () => { this.startRover(); };
    }

    startRover(){
        this.updateBackground();
        this.update = this.update.bind(this);
        this.interval = setInterval(this.update, this.timeFrameMSec);
    }

    stopRover(){
        clearInterval(this.interval);
    }

    createCamps( cnt ){
        let newCamp;
        let campDimX = 4
        let campDimY = 4;
        let campCollision;
        for( let id=0; id < cnt; id++ ){
            do{
                newCamp = new Camp(((this.xDim-(3*campDimX)).rnd()+(campDimX)).pix(), ((this.yDim-(3*campDimY)).rnd()+(campDimY)).pix(), 
                                         (campDimX*3).pix(), (campDimY*3).pix(), 0, {plan: this.CAMPPLANS[id], image: this.images.imgCampBar, offset: 0 }, 
                                         { ctx: this.canvasObstacles.ctx });
                if( id > 0 ) { campCollision = Boolean(this.camps.some( (existingCamp) => { return newCamp.isCollidedWith(existingCamp); })); }

            } while( campCollision );
            newCamp.shrinkDim((campDimX).pix(),(campDimY).pix(),(campDimX).pix(), (campDimY).pix());
            this.camps.push(newCamp);
        }
    }

    createObstacles( cnt ){
        let newObstacle;
        let campCollision;
        let offset = 0;
        let obstacleCollision = false;
        for( let id=0; id < cnt; id++ ){
            do{
                newObstacle = new Stone(((this.xDim-(2*offset)).rnd()+offset).pix(), ((this.yDim-(2*offset)).rnd()+offset).pix(), 
                                         (1).pix(), (1).pix(), 0, {image: this.images.imgObstacle, offset: 0 }, 
                                         { ctx: this.canvasObstacles.ctx });
                campCollision = Boolean(this.camps.some( (existingCamp) => { return newObstacle.isCollidedWith(existingCamp, true); }));
                if( id > 0 ) { obstacleCollision = Boolean(this.obstacles.some( (existingObstacle) => { return newObstacle.isCollidedWith(existingObstacle); })); }

            } while( obstacleCollision || campCollision );
            this.obstacles.push(newObstacle);
        }
    }

    createRovers( cnt ){
        let newRover;
        let campCollision;
        let obstacleCollision;
        let roverCollision = false;

        for( let id=0; id < cnt; id++ ){
            do{
                newRover = new Rover((this.xDim).rnd().pix(), (this.yDim).rnd().pix(), 
                                      (1).pix(), (1).pix(), (4).rnd(), {image: this.images.imgRover, offset: 0, track: this.images.imgTrack }, 
                                      { ctx: this.canvasGame.ctx, ctx_t: this.canvasTrack.ctx });
                obstacleCollision = Boolean(this.obstacles.some( (existingObstacle) => { return newRover.isCollidedWith(existingObstacle, true); }));
                campCollision = Boolean(this.camps.some( (existingCamp) => { return newRover.isCollidedWith(existingCamp, true); }));
                if( id > 0 ) { roverCollision = Boolean(this.rovers.some( (existingRover) => { return newRover.isCollidedWith(existingRover, true); })); }

            } while( obstacleCollision || roverCollision || campCollision );
            this.rovers.push(newRover);
        }
    }

    createPlayer(){
        let newPlayer;
        let campCollision;
        let obstacleCollision;
        let roverCollision = false;

        do{
            newPlayer = new Player((this.xDim).rnd().pix(), (this.yDim).rnd().pix(),
                                   (1).pix(), (1).pix(), (4).rnd(), {image: this.images.imgRover, offset: 1, track: this.images.imgTrack }, 
                                   { ctx: this.canvasGame.ctx, ctx_t: this.canvasTrack.ctx, ctx_p: this.canvasPlayer.ctx });
            obstacleCollision = Boolean(this.obstacles.some( (existingObstacle) => { return newPlayer.isCollidedWith(existingObstacle, true); }));
            campCollision = Boolean(this.camps.some( (existingCamp) => { return newPlayer.isCollidedWith(existingCamp, true); }));
            roverCollision = Boolean(this.rovers.some( (existingRover) => { return newPlayer.isCollidedWith(existingRover, true); }));

        } while( obstacleCollision || roverCollision  || campCollision );
        this.rovers.unshift(newPlayer);
    }

    clearRectGame(){
        this.canvasGame.ctx.clearRect(0, 0, this.canvasGame.canvas.width, this.canvasGame.canvas.height);
    }
    clearRectObstacles(){
        this.canvasObstacles.ctx.clearRect(0, 0, this.canvasObstacles.canvas.width, this.canvasObstacles.canvas.height);
    }
    clearRectTrack(){
        this.canvasTrack.ctx.clearRect(0, 0, this.canvasTrack.canvas.width, this.canvasTrack.canvas.height);
        this.canvasPlayer.ctx.clearRect(0, 0, this.canvasPlayer.canvas.width, this.canvasPlayer.canvas.height);
    }

    updateBackground(){
        this.clearRectGame();
        this.clearRectObstacles();
        this.clearRectTrack();
        this.obstacles.map( obstacle => { obstacle.update(); } );
        this.camps.map( camp => { camp.update(); } );
    }

    update(){
        this.clearRectGame();

        let obstacleCollision = false;
        let roverCollision = false;
        let campCollision = false;
        let outOfBound = false;

        let continueLoop = false;
        let loopCnt = 0;

        this.rovers.map( ( rover ) => {
            if( rover.wait > this.roverWait ) {
                rover.wait = 0;
                rover.disabled = false;
                rover.speedOn();
            }

            if( rover.disabled === false ){
                rover.newDir();

                loopCnt = 0;
                do{
                    outOfBound = Boolean(rover.isOutOfBound( this.xDim, this.yDim, true ));
                    obstacleCollision = Boolean(this.obstacles.some( (existingObstacle) => { return rover.isCollidedWith(existingObstacle, true); }));
                    campCollision = Boolean(this.camps.some( (existingCamp) => { return rover.isCollidedWith(existingCamp, true); }));
                    roverCollision = Boolean(this.rovers.some( (existingRover) => { return rover.isCollidedWith(existingRover, true); }));

                    continueLoop = false;
                    if( outOfBound || obstacleCollision || roverCollision || campCollision){
                        if( rover.objType !== rover.TYPE.PLAYER && loopCnt < rover.maxLoop ){
                            rover.newDir(true);
                            loopCnt++;
                            continueLoop = true;
                        } else {
                            rover.speedOff();
                            rover.disabled = true;
                        }
                    }
                } while( continueLoop );
                rover.newPos();
            } else {
                rover.wait++;
            }
            rover.update();
        });
    }
}

class ObjectStatic{
    constructor(x, y, width, height, design, ctxList){
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.design = design;
        this.isImage = (this.design.image)? true : false;
        this.ctxList = ctxList;
    }

    shrinkDim(x,y,w,h){
        this.x = this.x + x;
        this.y = this.y + y;
        this.width = w;
        this.height = h;
    }

    left() { return Math.round(this.x); }
    right() { return Math.round(this.x + this.width); }
    top() { return Math.round(this.y); }
    bottom() { return Math.round(this.y + this.height); }

    // check out of bound
    isOutOfBound(xDim, yDim) {
        let isOut = ( this.top() < 0 || this.left() < 0 || this.bottom() > (yDim).pix() || this.right() > (xDim).pix() );
        return isOut;
    }

    // check collision
    isCollidedWith(obstacle) {
        if (this === obstacle) return false;
        let isCollided = !(
            this.bottom() <= obstacle.top() ||
            this.top() >= obstacle.bottom() ||
            this.right() <= obstacle.left() ||
            this.left() >= obstacle.right()
            );            
        return isCollided;
    }

    update(){
        let offset = this.design.offset;

        if( this.isImage === true){
            if( this.ctxList.ctx_t ){ this.ctxList.ctx_t.drawImage(this.design.track, 0, 0, this.width, this.height, this.xOld, this.yOld, this.width, this.height); }
            if( this.ctxList.ctx_p ){ this.ctxList.ctx_p.drawImage(this.design.track, (1).pix(), 0, this.width, this.height, this.xOld, this.yOld, this.width, this.height); }
            this.ctxList.ctx.drawImage(this.design.image, this.width * offset, this.height * this.direction, this.width, this.height, this.x, this.y, this.width, this.height);
        } else {
            this.ctxList.ctx.fillStyle = this.design.color;
            this.ctxList.ctx.fillRect(this.x, this.y, this.width,this.height);
        }
    }
}

class Object{
    constructor(x, y, width, height, direction, design, ctxList){
        this.dir = [ {xDir: 0, yDir: -1}, {xDir: 1, yDir: 0}, {xDir: 0, yDir: 1}, {xDir: -1, yDir: 0}];
        this.speed = {x:2, y:2};
        this.TYPE = { STONE: 0, ROVER: 1, CAMP: 2, PLAYER: 3 };

        this.x = x;
        this.y = y;
        this.xOld = x;
        this.yOld = y;
        this.width = width;
        this.height = height;
        this.design = design;
        this.isImage = (this.design.image)? true : false;
        this.ctxList = ctxList;
        this.speedX = 0;
        this.speedY = 0;
        this.stepCnt = 0;
        this.stepMax = 10;
        this.direction = direction;
        this.disabled = false;
        this.paused = false;
        this.wait = 0;
        this.objType = -1;
        this.setStepMax();
    }

    shrinkDim(x,y,w,h){
        this.x = this.x + x;
        this.y = this.y + y;
        this.xOld = this.x;
        this.yOld = this.y;
        this.width = w;
        this.height = h;
    }

    setStepMax(){
        let factor = 5;
        let step = 10;
        let min = 10;
        this.stepMax = (Math.floor(Math.random()*factor)*step) + min;
        this.stepCnt = 0;
    }

    left() { return Math.round(this.x); }
    right() { return Math.round(this.x + this.width); }
    top() { return Math.round(this.y); }
    bottom() { return Math.round(this.y + this.height); }

    // check out of bound
    isOutOfBound(xDim, yDim, inclSpeed) {
        if( inclSpeed === true ) {
            this.x += this.speedX * this.dir[this.direction].xDir;
            this.y += this.speedY * this.dir[this.direction].yDir;
        }
        let isOut = ( this.top() < 0 || this.left() < 0 || this.bottom() > (yDim).pix() || this.right() > (xDim).pix() );

        if( inclSpeed === true ) {
            this.x -= this.speedX * this.dir[this.direction].xDir;
            this.y -= this.speedY * this.dir[this.direction].yDir;
        }        
        return isOut;
    }

    // check collision
    isCollidedWith(obstacle, inclSpeed) {
        if (this === obstacle) return false;
        if( inclSpeed === true ) {
            this.x += this.speedX * this.dir[this.direction].xDir;
            this.y += this.speedY * this.dir[this.direction].yDir;
        }

        let isCollided = !(
            this.bottom() <= obstacle.top() ||
            this.top() >= obstacle.bottom() ||
            this.right() <= obstacle.left() ||
            this.left() >= obstacle.right()
            );
            
        if( inclSpeed === true ) {
            this.x -= this.speedX * this.dir[this.direction].xDir;
            this.y -= this.speedY * this.dir[this.direction].yDir;
        }        
        return isCollided;
    }

    setGear(){};
    toggleSpeed() {};
    speedOn() { this.speedX = this.speed.x; this.speedY = this.speed.y; }
    speedOff() { this.speedX = 0; this.speedY = 0; }
    setDir( dir ) { this.direction = dir; }

    newDir( reset ){
        if( this.disabled === false && this.paused === false ){
            if( reset === true || ((this.stepCnt > this.stepMax) && (this.objType !== this.TYPE.PLAYER)) ){
                this.direction = ((24).rnd())%4;
                this.setStepMax();
            }
        }
    }

    newPos(){
        if( this.disabled === false && this.paused === false ){
            this.xOld = this.x;
            this.yOld = this.y;
            this.x += this.speedX * this.dir[this.direction].xDir;
            this.y += this.speedY * this.dir[this.direction].yDir;
        }
    }

    update(){
        let dir;
        let offset = this.design.offset;

        this.stepCnt++;
        if( this.isImage === true){
            if( this.objType !== this.TYPE.PLAYER ) {
                if( this.disabled === false ){
                    //offset = offset % 4;
                } else {
                    offset = 2;
                }
            }
            if( this.ctxList.ctx_t ){
                this.ctxList.ctx_t.drawImage(this.design.track, 0, 0, this.width, this.height, this.xOld, this.yOld, this.width, this.height);
            }
            if( this.ctxList.ctx_p ){
                this.ctxList.ctx_p.drawImage(this.design.track, (1).pix(), 0, this.width, this.height, this.xOld, this.yOld, this.width, this.height);                    
            }
            this.ctxList.ctx.drawImage(this.design.image, this.width * offset, this.height * this.direction, this.width, this.height, this.x, this.y, this.width, this.height);
        } else {
            this.ctxList.ctx.fillStyle = this.design.color;
            this.ctxList.ctx.fillRect(this.x, this.y, this.width,this.height);
        }
    }
}

class Stone extends Object{
    constructor(x, y, width, height, direction, design, ctxList){
        super(x, y, width, height, direction, design, ctxList);
        this.objType = this.TYPE.STONE;
        this.speedOff();
    }
}

class Rover extends Object{
    constructor(x, y, width, height, direction, design, ctxList){
        super(x, y, width, height, direction, design, ctxList);
        this.objType = this.TYPE.ROVER;
        this.maxLoop = (Math.floor(Math.random()*5)*5)+20;
        this.speedOn();
    }
}

class Player extends Object{
    constructor(x, y, width, height, direction, design, ctxList){
        super(x, y, width, height, direction, design, ctxList);
        this.objType = this.TYPE.PLAYER;
        this.speed = {x:4, y:4};
        this.paused = true;
        this.speedOn();
    }
    setGear( gear ){
        this.speed = {x:(2*gear), y:(2*gear)};
        if( this.paused === false ) this.speedOn();
    };

    toggleSpeed() {
        if( this.objType === this.TYPE.PLAYER ){
            this.paused = !this.paused;
        }
    }

}

class Camp extends Object{
    constructor(x, y, width, height, direction, design, ctxList){
        super(x, y, width, height, direction, design, ctxList);
        this.objType = this.TYPE.CAMP;
        this.speedOff();
    }

    update(){
        let offset = 0;

        if( this.isImage === true){
            this.design.plan.forEach( (obj,id) => {
                let imgX = obj.pix(20);
                let posX = this.x + (id%4).pix();
                let posY = this.y + (Math.floor(id/4)).pix();
                this.ctxList.ctx.drawImage(this.design.image, imgX, 0, 20, 20, posX-2, posY-2, 20, 20);
            });
        } else {
            this.ctxList.ctx.fillStyle = this.design.color;
            this.ctxList.ctx.fillRect(this.x, this.y, this.width,this.height);
        }
    }
}

