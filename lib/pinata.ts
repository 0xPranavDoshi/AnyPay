
interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

interface StoreImageResult {
  cid: string;
  url: string;
  pinSize: number;
  timestamp: string;
}

export async function storeImage(image: File | Buffer | Blob, fileName?: string): Promise<StoreImageResult> {
  try {
    if (!process.env.PINATA_API_KEY) {
      throw new Error('PINATA_API_KEY environment variable is required');
    }

    if (!process.env.PINATA_SECRET_API_KEY) {
      throw new Error('PINATA_SECRET_API_KEY environment variable is required');
    }

    // Create FormData for the upload
    const formData = new FormData();
    
    // Handle different image types
    if (image instanceof File) {
      formData.append('file', image);
    } else if (image instanceof Buffer) {
      const blob = new Blob([image]);
      formData.append('file', blob, fileName || 'image.jpg');
    } else if (image instanceof Blob) {
      formData.append('file', image, fileName || 'image.jpg');
    } else {
      throw new Error('Unsupported image type. Must be File, Buffer, or Blob');
    }

    // Add metadata
    const metadata = {
      name: fileName || `image-${Date.now()}`,
      keyvalues: {
        uploadedAt: new Date().toISOString(),
        source: 'anypay-app'
      }
    };
    
    formData.append('pinataMetadata', JSON.stringify(metadata));

    // Pin options
    const pinataOptions = {
      cidVersion: 1,
    };
    
    formData.append('pinataOptions', JSON.stringify(pinataOptions));

    // Upload to Pinata
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': process.env.PINATA_API_KEY,
        'pinata_secret_api_key': process.env.PINATA_SECRET_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pinata API error: ${response.status} - ${errorText}`);
    }

    const result: PinataResponse = await response.json();
    
    console.log(`Successfully stored image to IPFS: ${result.IpfsHash}`);
    
    return {
      cid: result.IpfsHash,
      url: `https://ipfs.io/ipfs/${result.IpfsHash}`,
      pinSize: result.PinSize,
      timestamp: result.Timestamp,
    };
  } catch (error) {
    console.error('Error storing image to Pinata:', error);
    throw new Error(`Failed to store image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function storeImageFromUrl(imageUrl: string, fileName?: string): Promise<StoreImageResult> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
    }

    // Get the image as a buffer
    const imageBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);
    
    // Determine filename from URL or use provided name
    const finalFileName = fileName || imageUrl.split('/').pop() || 'image.jpg';
    
    // Store to Pinata
    return await storeImage(buffer, finalFileName);
  } catch (error) {
    console.error('Error storing image from URL:', error);
    throw new Error(`Failed to store image from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function downloadImageFromPinata(ipfsUrl: string): Promise<string> {
  try {
    console.log(`Downloading image from IPFS: ${ipfsUrl}`);
    
    // Try multiple IPFS gateways for better reliability
    const gateways = [
      ipfsUrl,
      ipfsUrl.replace('ipfs.io', 'gateway.pinata.cloud'),
      ipfsUrl.replace('ipfs.io', 'cloudflare-ipfs.com'),
    ];
    
    for (const gateway of gateways) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const response = await fetch(gateway, { 
          signal: controller.signal,
          headers: {
            'Accept': 'image/*',
          }
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) {
          console.warn(`Gateway ${gateway} failed: ${response.status}`);
          continue;
        }
        
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await response.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        
        console.log(`Successfully downloaded image from ${gateway}`);
        return `data:${contentType};base64,${base64Data}`;
        
      } catch (gatewayError) {
        console.warn(`Failed to download from ${gateway}:`, gatewayError);
        continue;
      }
    }
    
    throw new Error('All IPFS gateways failed');
    
  } catch (error) {
    console.error('Error downloading image from Pinata:', error);
    throw new Error(`Failed to download image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function pinImageByCid(cid: string): Promise<void> {
  try {
    if (!process.env.PINATA_API_KEY) {
      throw new Error('PINATA_API_KEY environment variable is required');
    }

    if (!process.env.PINATA_SECRET_API_KEY) {
      throw new Error('PINATA_SECRET_API_KEY environment variable is required');
    }

    const response = await fetch('https://api.pinata.cloud/pinning/pinByHash', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': process.env.PINATA_API_KEY,
        'pinata_secret_api_key': process.env.PINATA_SECRET_API_KEY,
      },
      body: JSON.stringify({
        hashToPin: cid,
        pinataMetadata: {
          name: `pinned-${cid}`,
          keyvalues: {
            pinnedAt: new Date().toISOString(),
            source: 'anypay-app'
          }
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pinata pin API error: ${response.status} - ${errorText}`);
    }

    console.log(`Successfully pinned content: ${cid}`);
  } catch (error) {
    console.error('Error pinning content:', error);
    throw new Error(`Failed to pin content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
