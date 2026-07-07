import os
import struct
def manage_precompute(f, file_path):
    dir_name = os.path.dirname(file_path)
    
    # Add a layer of gzip compression
    file_path = file_path + '.gz'

    # 1. Check if the file exists or not
    if not os.path.exists(file_path + ''):
        print(f"'{file_path}' not found. Generating data...")
        
        # Call function f() to get the list of ints
        data_list = f()
        
        # Ensure the 'precompute' directory exists
        from pathlib import Path
        path = Path(file_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        
        # 2. Store the numbers as 64-bit unsigned integers (uint64)
        # 'Q' represents an unsigned long long (64-bit integer) in struct
        import gzip
        with gzip.open(file_path, "wb") as bin_file:
            for num in data_list:
                # Pack the integer into 8 bytes (64 bits) and write it
                bin_file.write(struct.pack("<Q", num))
        print(f"Data successfully saved to '{file_path}'.")
    else:
        print(f"'{file_path}' already exists. Skipping generation.")

    # 3. Read the file and store the numbers in list A
    A = []
    element_size = 8 # 64 bits = 8 bytes
    
    import gzip
    with gzip.open(file_path, "rb") as bin_file:
        while True:
            bytes_read = bin_file.read(element_size)
            if not bytes_read:
                break # End of file reached
            
            # Unpack the 8 bytes back into a Python integer
            # struct.unpack returns a tuple, so we grab the first element [0]
            num = struct.unpack("<Q", bytes_read)[0]
            A.append(num)
            
    return A
