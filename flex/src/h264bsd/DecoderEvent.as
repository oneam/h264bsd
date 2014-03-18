package h264bsd
{
    import flash.events.Event;

    public class DecoderEvent extends Event
    {
        public static const PICTURE_READY:String = "pictureReady";
        public static const HEADERS_READY:String = "headersReady";
        
        public function DecoderEvent(type:String, bubbles:Boolean=false, cancelable:Boolean=false)
        {
            super(type, bubbles, cancelable);
        }
    }
}