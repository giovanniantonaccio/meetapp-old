import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore } from 'date-fns';
import Meetup from '../models/Meetup';
import File from '../models/File';
import User from '../models/User';

class MeetupController {
  async index(req, res) {
    const { page } = req.query;
    const pagination_limit = 10;

    const meetups = await Meetup.findAll({
      where: { user_id: req.userId },
      order: ['date'],
      limit: pagination_limit,
      offset: (page - 1) * pagination_limit,
      attributes: ['id', 'name', 'description', 'location', 'date'],
      include: [
        {
          model: File,
          as: 'banner',
          attributes: ['id', 'path', 'url'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    return res.json(meetups);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string().required(),
      description: Yup.string().required(),
      location: Yup.string().required(),
      date: Yup.date().required(),
      banner_id: Yup.number(),
      user_id: Yup.number(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation failed' });
    }

    const { name, description, location, date, banner_id } = req.body;

    /**
     * Check if date is in the past
     */
    const hourStart = startOfHour(parseISO(date));
    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Past dates are not permitted' });
    }

    const meetup = await Meetup.create({
      name,
      description,
      location,
      date: hourStart,
      banner_id,
      user_id: req.userId,
    });

    return res.json(meetup);
  }

  async update(req, res) {
    const { id } = req.params;
    const { name, description, location, date, banner_id } = req.body;

    const meetup = await Meetup.findByPk(id);

    /**
     * Check if the meetup exist
     */
    if (!meetup) {
      return res.status(400).json({ error: 'Meetup does not exist' });
    }

    /**
     * Check if the user is the owner of the meetup
     */
    if (meetup.user_id !== req.userId) {
      return res.status(401).json({ error: 'User is not owner of the meetup' });
    }

    /**
     * Check if the meetup is in the past
     */
    if (isBefore(meetup.date, new Date())) {
      return res
        .status(400)
        .json({ error: 'Cannot update meetups that already occured' });
    }

    /**
     * Check if the banner exists
     */
    const bannerExists = await File.findByPk(banner_id);
    if (banner_id && !bannerExists) {
      return res.status(400).json({ error: 'Banner does not exist' });
    }

    /**
     * Check if date is in the past
     */
    const hourStart = startOfHour(parseISO(date));
    if (date && isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Cannot update for a past date' });
    }

    const updatedMeetup = await meetup.update({
      name,
      description,
      location,
      date: hourStart,
      banner_id,
    });

    return res.json(updatedMeetup);
  }

  async delete(req, res) {
    const { id } = req.params;

    const meetup = await Meetup.findByPk(id);

    /**
     * Check if the meetup exist
     */
    if (!meetup) {
      return res.status(400).json({ error: 'Meetup does not exist' });
    }

    /**
     * Check if the user is the owner of the meetup
     */
    if (meetup.user_id !== req.userId) {
      return res.status(401).json({ error: 'User is not owner of the meetup' });
    }

    /**
     * Check if the meetup is in the past
     */
    if (isBefore(meetup.date, new Date())) {
      return res
        .status(400)
        .json({ error: 'Cannot delete meetups that already occured' });
    }

    await Meetup.destroy({ where: { id } });

    return res.json();
  }
}

export default new MeetupController();
