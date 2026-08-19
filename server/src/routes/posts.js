const express = require('express');
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const gamification = require('../services/gamification');
const { notifyUser } = require('../services/notify');

const router = express.Router();

router.use(auth);

const PUBLIC_URL_PREFIX = process.env.PUBLIC_URL || '';

function mediaUrl(file) {
  return `${PUBLIC_URL_PREFIX}/uploads/${file.filename}`;
}

async function populatePost(post) {
  return Post.populate(post, [
    { path: 'author', select: 'username avatar xp level' },
    { path: 'reactions.user', select: 'username avatar' },
    { path: 'comments.author', select: 'username avatar' },
  ]);
}

// Get all posts for user's couple
router.get('/', async (req, res) => {
  try {
    if (!req.user.coupleId) {
      return res.json({ posts: [] });
    }

    const posts = await Post.find({ coupleId: req.user.coupleId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('author', 'username avatar xp level')
      .populate('reactions.user', 'username avatar')
      .populate('comments.author', 'username avatar');

    res.json({ posts });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create a post (with optional media)
router.post('/', upload.single('media'), async (req, res) => {
  try {
    if (!req.user.coupleId) {
      return res.status(400).json({ message: 'Must be in a couple to post' });
    }

    const text = (req.body.text || '').trim();
    const mediaFile = req.file;

    if (!text && !mediaFile) {
      return res.status(400).json({ message: 'Post must have text or media' });
    }

    const mediaType = mediaFile
      ? (mediaFile.mimetype.startsWith('video') ? 'video' : 'image')
      : null;

    const post = new Post({
      author: req.user._id,
      coupleId: req.user.coupleId,
      text,
      mediaUrl: mediaFile ? mediaUrl(mediaFile) : '',
      mediaType: mediaType || 'image',
    });

    await post.save();

    if (text) {
      await gamification.addXP(req.user._id, gamification.XP.CREATE_POST);
    }

    await populatePost(post);
    res.status(201).json({ post });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Toggle a reaction on a post
router.post('/:id/react', async (req, res) => {
  try {
    const { type } = req.body;
    if (!['like', 'diamond', 'pig'].includes(type)) {
      return res.status(400).json({ message: 'Invalid reaction type' });
    }

    const post = await Post.findOne({
      _id: req.params.id,
      coupleId: req.user.coupleId,
    });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const existingIdx = post.reactions.findIndex(
      (r) => r.user.toString() === req.user._id.toString() && r.type === type
    );

    if (existingIdx >= 0) {
      post.reactions.splice(existingIdx, 1);
    } else {
      post.reactions.push({ user: req.user._id, type });
      if (post.author.toString() !== req.user._id.toString()) {
        const io = req.app.get('io');
        await gamification.addXP(post.author, gamification.XP.RECEIVE_REACTION, io);
        await notifyUser(io, post.author, {
          type: 'post',
          title: 'New Reaction',
          message: `${req.user.username} reacted to your post`,
          icon: '❤️',
          data: { postId: post._id },
        });
      }
    }

    await post.save();
    await populatePost(post);
    res.json({ reactions: post.reactions, post });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add a comment to a post
router.post('/:id/comment', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text required' });
    }

    const post = await Post.findOne({
      _id: req.params.id,
      coupleId: req.user.coupleId,
    });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.comments.push({ author: req.user._id, text: text.trim() });
    await post.save();

    if (post.author.toString() !== req.user._id.toString()) {
      const io = req.app.get('io');
      await gamification.addXP(req.user._id, gamification.XP.COMMENT, io);
      await notifyUser(io, post.author, {
        type: 'post',
        title: 'New Comment',
        message: `${req.user.username} commented: "${text.trim().slice(0, 80)}"`,
        icon: '💬',
        data: { postId: post._id },
      });
    }

    await populatePost(post);
    res.json({ comments: post.comments, post });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete a post
router.delete('/:id', async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      coupleId: req.user.coupleId,
    });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }

    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;