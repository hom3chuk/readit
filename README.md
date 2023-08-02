# readit
"Read it" /ɹɛd ɪt/ is a tool with no package dependencies that extracts Pushshift.io data archives from [The Eye Reddit Archives](https://the-eye.eu/redarcs/) into HTML files that are
- redistributable: can be copied elsewhere as a single HTML file.
- lightweight: only needed data is embeded, which is text and OP images links.
- compatible: no JS needed to render the files, they can be viewed on pretty much anything that is capable rendering HTML

## Requirements
- nodejs v16 or higher ([how to install](https://nodejs.dev/en/learn/how-to-install-nodejs/))
- any zstd-compatible app that can unpack `zstd` files:
  - windows: look for `zstd-vx.y.z-win64.zip` or `zstd-vx.y.z-win32.zip` in the latest release's "Assets" section
 [at the official zstd releases page](https://github.com/facebook/zstd/releases)
  - OS X: install `zstd` using homebrew, then use `unzstd filename.zst`

## Usage

### 1. Clone the repo

Clone the repo via `git clone` or just download the ZIP archive and unpack it. All commands and files are meant to happen inside that directory.

No usual instalation is required. No `yarn`, no `npm install`, just download and it's ready to go.

### 2. Unpack `zst` archives for both Submissions and Comments

We gonna use r/Permaculture as an example. After downloading both files from The Eye, you'll end up with two files:
```
$ ls
Permaculture_comments.zst   Permaculture_submissions.zst
```

Unpack them:
```
$ unzstd Permaculture_comments.zst 
Permaculture_comments.zst: 425907510 bytes  

$ unzstd Permaculture_submissions.zst 
Permaculture_submissions.zst: 97972912 bytes 
```

You'll end up with two more files: `Permaculture_comments` and `Permaculture_submissions`

### 3. Run readit

**Keep in mind:** readit creates `cache` subfolder where it stores indexed comments data. For a 406 MB comments file, `cache` used 453 MB of disk storage (OS X). Please be aware of that disk space requirement when processing huge subreddits.

Now we can run readit to process these files into readable HTML (don't forget to provide your sub name):

```
$ node readit.js Permaculture
Prebuilding comments cache (each dot is 1k comments processed)
...............................................................................................................................................................................................................................................................................................................................................
Processing submissions (each dot is 100 posts)
................................................................................................................................................................................................................................................................................................
```

Once readit starts the second phase (`Processing submissions`) you can see that `out` directory is being populated with HTML files. Those are ready to be used or distributed right away.

HTML files are pretty simple, yet some of the reddit's markdown is supported.

### 4. Cleanup
If you plan on extracting another sub, please manually delete the `cache` and `out` directories beforehand.

## Roadmap
- a lil bit more (selectable) styles in output HTML
- download from The Eye & unpack
- search/partial export
- better UX with cleaning up and cache
- word cloud index so yo ucan explore topics you never knew about

## Example HTML

![image](https://github.com/hom3chuk/readit/assets/3368441/ed6d1bb6-4bdf-4bfa-b138-375e3dda118f)
![image](https://github.com/hom3chuk/readit/assets/3368441/e1c0d0ba-4832-4cee-bf55-4cfd1cde0600)

---

Ope!
