from django.core.management.base import BaseCommand
from django.utils import timezone
from scheduling.services import check_and_trigger_optimizations, archive_expired_recruitments
import time
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'background task to check optimization triggers and archive expired recruitments'

    def add_arguments(self, parser):
        parser.add_argument(
            '--interval',
            type=int,
            default=60,
            help='check interval in seconds (default: 60)'
        )

    def handle(self, *args, **options):
        interval = options['interval']
        logger.info(f"starting scheduler (interval: {interval}s)")
        
        try:
            while True:
                try:
                    check_and_trigger_optimizations()
                    archive_expired_recruitments()
                except Exception as e:
                    logger.error(f"error in scheduler: {e}")
                    self.stderr.write(f"error: {e}")
                
                time.sleep(interval)
        except KeyboardInterrupt:
            logger.info("scheduler stopped")
