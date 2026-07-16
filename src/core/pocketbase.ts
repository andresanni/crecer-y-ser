import PocketBase from 'pocketbase';

const pb = new PocketBase('http://129.121.52.187:8090');

pb.autoCancellation(false); 

export default pb;