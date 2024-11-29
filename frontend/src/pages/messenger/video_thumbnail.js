// Function to get thumbnail from video file
export function getVideoThumbnail(videoFile, fileName = 'thumbnail.jpg') {
	return new Promise((resolve, reject) => {
	  const video = document.createElement('video');
	  video.preload = 'metadata';
	  video.playsInline = true;
	  video.muted = true;
  
	  const url = URL.createObjectURL(videoFile);
	  video.src = url;

	  const canvas = document.createElement('canvas');
	  const ctx = canvas.getContext('2d');
  
	  video.onloadedmetadata = () => {
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		
		const seekTime = Math.min(1.0, video.duration);
		video.currentTime = seekTime;
	  };
  
	  video.onseeked = () => {
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
		
		canvas.toBlob((blob) => {
		  // Clean up
		  URL.revokeObjectURL(url);
		  
		  // Create a File object from the blob
		  const thumbnailFile = new File(
			[blob],
			fileName,
			{ type: 'image/jpeg', lastModified: Date.now() }
		  );
		  
		  resolve({
			file: thumbnailFile,
			width: canvas.width,
			height: canvas.height
		  });
		}, 'image/jpeg', 0.8);
	  };
  
	  video.onerror = (error) => {
		URL.revokeObjectURL(url);
		reject(error);
	  };
	});
  }