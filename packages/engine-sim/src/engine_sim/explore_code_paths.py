# To be able to go through all possible choices, all possible paths in the code 
# is given an id ("path_id"). This allows exploring all possible code-paths.

def explore_all_paths(f, starting_id = 0):
    print('exploring all')
    path_id = -1
    next_path_id = starting_id # The initial path_id
    def make_choice(A):
        nonlocal part_previously_read, next_path_id
        m = len(A)
        alt = (path_id//part_previously_read) % m
        
        print('### Making a choice, chosing alternative:', alt)

        if alt != m - 1:
            nonlocal next_path_id
            next_path_id = (path_id + part_previously_read) % (m * part_previously_read)
        part_previously_read *= m
        return A[alt]
   
    count = 0
    #next_path_id = 546110
    while path_id != next_path_id:
        path_id = next_path_id
        part_previously_read = 1
        
        class fake_stdout:
            def flush(self):
                return
            def write(self, s):
                return
        
        import sys
        sys.stdout = fake_stdout()
        
        print()
        print('STARTING NEW TEST #', count, 'with path_id:', path_id, flush=True)
        print()
        count += 1

        yield f(make_choice, path_id)
        #exit()
        sys.stdout = sys.__stdout__

def explore_specifc_paths(f, path_ids):
    print('exploring specific')
    def make_choice(A):
        nonlocal part_previously_read
        m = len(A)
        alt = (path_id//part_previously_read) % m
        
        print('### Making a choice, chosing alternative:', alt)

        part_previously_read *= m
        return A[alt]
    
    count = 0
    
    for path_id in path_ids:
        part_previously_read = 1
        
        class fake_stdout:
            def flush(self):
                return
            def write(self, s):
                return
        
        import sys
        sys.stdout = fake_stdout()
        
        print()
        print('STARTING NEW TEST #', count, 'with path_id:', path_id, flush=True)
        print()
        count += 1

        
        yield f(make_choice, path_id)
        sys.stdout = sys.__stdout__
