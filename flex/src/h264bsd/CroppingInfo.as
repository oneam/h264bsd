package h264bsd
{
    public class CroppingInfo 
    {
        private var _width:int = 0;
        private var _height:int = 0;
        private var _top:int = 0;
        private var _left:int = 0;
        private var _widthUncropped:int = 0;
        private var _heightUncropped:int = 0;
        
        public function CroppingInfo(widthUncropped:int, heightUncropped:int, widthCrop:int, heightCrop:int, top:int, left:int) {
            _widthUncropped = widthUncropped;
            _heightUncropped = heightUncropped;
            _width = widthCrop;
            _height = heightCrop;
            
            if (_width == 0)
                _width = _widthUncropped;
            
            if (_height == 0)
                _height = _heightUncropped;
            
            _top = top;
            _left = left;
        }
        
        public function get uncroppedWidth():int {
            return _widthUncropped;
        }
        
        public function get uncroppedHeight():int {
            return _heightUncropped;
        }
        
        public function get width():int {
            return _width;    
        }
        
        public function get height():int {
            return _height;    
        }
        
        public function get top():int {
            return _top;    
        }
        
        public function get left():int {
            return _left;    
        }
    }
}
