from pathlib import Path

IGNORE_DIRS = {
    '__pycache__',
    '.venv',
    '.env',
    '.git',
    '.idea',
    '.vscode',
    'migrations',
}


def print_tree(directory, prefix=''):
    path = Path(directory)
    contents = sorted([
        p for p in path.iterdir() if p.name not in IGNORE_DIRS
    ])
    pointers = ['├── '] * (len(contents) - 1) + ['└── ']

    for pointer, item in zip(pointers, contents):
        print(f'{prefix}{pointer}{item.name}')
        if item.is_dir():
            extension = '│   ' if pointer == '├── ' else '    '
            print_tree(item, prefix + extension)


if __name__ == '__main__':
    print_tree('.')