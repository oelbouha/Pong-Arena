import random
from datetime import timedelta
from datetime import datetime

from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from game.models  import Match, MatchStatus
from .models import Tournament, Participant
from .serializers import TournamentSerializer, MatchSerializer
from .models import TournamentStatus

from shared_models.utils import notify

def basic_user_data(user):
    return {
            'id': user.id,
            'image': user.profile_image.name,
            'name': f'{user.first_name} {user.last_name}',
            'username': f'{user.username}'
    }


def tournament_notify(t:Tournament, notif_type, _except=None, **kwargs):
    users_ids = t.participant_set.values_list('user__id', flat=True)
    for user_id in users_ids:
        if user_id == _except:
            continue
        notify(
            user_id,
            type=notif_type,
            tournament_id=t.id,
            tournament_name=t.name,
            tournament_image=t.image.name,
            tournament_round=t.current_round,
            tournament_game=t.game,
            **kwargs
        )


class TournamentViewSet(viewsets.ModelViewSet):
    queryset = Tournament.objects.all()
    serializer_class = TournamentSerializer

    @action(detail=False, methods=['get'], url_path='search')
    def search_tournament(self, request):
        query = request.query_params.get('q')
        ts = Tournament.objects.none()
        if query:
            ts = Tournament.objects.filter(name__icontains=query) | Tournament.objects.filter(created_by__username__icontains=query)
        return Response(TournamentSerializer(ts, many=True).data, status=200)
    
    @action(detail=True, methods=['post'], url_path='lock')
    def lock_tournament(self, request, pk=None):
        tournament = self.get_object()
        if tournament.created_by != request.user or tournament.status != TournamentStatus.PENDING:
            return Response({
                        "detail": "You are not authorized to lock this tournament."
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
        elif tournament.participant_set.count() != tournament.capacity:
            return Response({
                        "detail": "Tournament is not full yet."
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
            
        tournament.status = TournamentStatus.LOCKED 
        tournament.save()
        tournament_notify(tournament, 'tournament_locked', request.user.id)
        return Response({"detail": "Tournament locked successfully."}, status=status.HTTP_200_OK)
    

    @action(detail=True, methods=['post'], url_path='start_round')
    def start_round(self, request, pk=None):
        tournament:Tournament = self.get_object()
        
        if tournament.created_by != request.user:
            return Response({"detail": "You are not authorized to start a round for this tournament."}, status=status.HTTP_403_FORBIDDEN)
        
        if (tournament.status != TournamentStatus.LOCKED):
            return Response({"detail": "This tournament is not yet locked."}, status=status.HTTP_400_BAD_REQUEST)
        
        if tournament.current_round == 1:
            participants = list(tournament.participant_set.all())
            random.shuffle(participants)
            with transaction.atomic():
                for  i in range(0,  len(participants), 2):
                    Match.objects.create(
                        p1 = participants[i].user,
                        p2 = participants[i + 1].user,
                        tournament = tournament,
                        type = tournament.game,
                        round = tournament.current_round,
                        order = i / 2
                    )
        else:
            matches = tournament.match_set.filter(round=tournament.current_round - 1)
            finished = tournament.match_set.filter(status=MatchStatus.FINISHED).count() == matches.count()
            if not finished:
                return Response({'detail': f'Round {tournament.current_round - 1} has not yet concluded'}, status=status.HTTP_400_BAD_REQUEST)
            
            matches = matches.order_by('order')
            for i in range(0, len(matches), 2):
                user1 = matches[i].p1 if matches[i].p1_score > matches[i].p2_score else matches[i].p2
                user2 = matches[i + 1].p1 if matches[i].p1_score > matches[i + 1].p2_score else matches[i + 1].p2
                Match.objects.create(
                    p1 = user1,
                    p2 = user2,
                    tournament = tournament,
                    round = tournament.current_round,
                    order = i / 2
                )

        
        tournament.current_round += 1
        tournament.save()
        tournament_notify(tournament, 'tournament_round_start')
        return Response({"detail": f"Round {tournament.current_round} started."}, status=status.HTTP_200_OK)

    
    @action(detail=True, methods=["post"])
    def assign_winner(self, request, pk=None):
        user = request.user
        
        tournament = self.get_object()
        if user != tournament.created_by:
            return Response({"detail": "You are not authorized to assign a winner."}, status=status.HTTP_403_FORBIDDEN)
        
        match_id = request.data.get('match_id')
        winner_id = request.data.get('user_id')
        
        match = tournament.match_set.get(pk=match_id)
        winner = match.p1 if match.p1.id == winner_id else match.p2
        
        if winner.id != winner_id:
            return Response({'detail': 'Invalid winner'}, status=status.HTTP_400_BAD_REQUEST)
        
        if tournament.status == TournamentStatus.LOCKED:
            if timezone.now() > match.date + timedelta(minutes=5) and match.status == MatchStatus.PENDING:
                match.p1_score = match.winning_score if match.p1 == winner else 0
                match.p2_score = match.winning_score if match.p2 == winner else 0
                match.status = MatchStatus.FINISHED
                match.save()
                serializer = MatchSerializer(match)
                return Response(serializer.data)
            else:
                return Response({"detail": "You can only assign a winner 5 minutes after the round has started"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({"detail": "Tournament is not ongoing."}, status=status.HTTP_400_BAD_REQUEST)


    @action(detail=True, methods=['get'], url_path='matches')
    def list_matches(self, request, pk=None):
        tournament = self.get_object()
        matches = tournament.match_set.all()
        serializer = MatchSerializer(matches, many=True) 
        return Response(serializer.data, status=status.HTTP_200_OK)


    @action(detail=True, methods=['delete'], url_path='delete')
    def delete_tournament(self, request, pk=None):
        tournament:Tournament = self.get_object()
        if tournament.created_by != request.user:
            return Response({"detail": "You are not authorized to delete this tournament."}, status=status.HTTP_403_FORBIDDEN)
        if tournament.status != TournamentStatus.PENDING:
            return Response({'detail': 'It is already too late to delete this tournament'})
        tournament.delete()
        return Response({"detail": "Tournament deleted successfully."}, status=status.HTTP_200_OK)


    @action(detail=True, methods=['post'], url_path='join')
    def join_tournament(self, request, pk=None):
        tournament = self.get_object()
        user = request.user
        
        if (tournament.status == TournamentStatus.LOCKED):
            return Response({"detail": "This tournament is already locked."}, status=status.HTTP_400_BAD_REQUEST)

        if Participant.objects.filter(user=user, tournament=tournament).exists():
            return Response({"detail": "You are already part of this tournament."}, status=status.HTTP_400_BAD_REQUEST)

        if Participant.objects.filter(tournament=tournament).count() >= tournament.capacity:
            return Response({"detail": "This tournament is full."}, status=status.HTTP_400_BAD_REQUEST)

        Participant.objects.create(user=user, tournament=tournament, round=tournament.current_round)
        
        tournament_notify(tournament, 'tournament_user_joined', user.id, user=basic_user_data(user))
        
        return Response({"detail": "You have successfully joined the tournament."}, status=status.HTTP_201_CREATED)


    @action(detail=True, methods=['post'], url_path='leave')
    def leave_tournament(self, request, pk=None):
        tournament = self.get_object()
        user = request.user
        
        if (tournament.status == TournamentStatus.LOCKED):
            return Response({"detail": "This tournament is already locked."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            participant = Participant.objects.get(user=user, tournament=tournament)
            participant.delete()
            tournament_notify(tournament, 'tournament_user_left', user.id, user=basic_user_data(user))
            return Response({"detail": "You have left the tournament."}, status=status.HTTP_200_OK)
        except Participant.DoesNotExist:
            return Response({"detail": "You are not part of this tournament."}, status=status.HTTP_400_BAD_REQUEST)


    @action(detail=True, methods=['post'], url_path='kick/(?P<participant_id>[^/.]+)')
    def kick_participant(self, request, pk=None, participant_id=None):
        tournament = self.get_object()
        user = request.user

        if tournament.created_by != user or tournament.status == TournamentStatus.LOCKED:
            return Response({"detail": "You are not authorized to kick participants from this tournament."}, status=status.HTTP_403_FORBIDDEN)

        try:
            participant = Participant.objects.get(user_id=participant_id, tournament=tournament)
            participant.delete()
            tournament_notify(tournament, 'tournament_user_kicked', user.id, user=basic_user_data(user))
            return Response({"detail": "Participant has been kicked from the tournament."}, status=status.HTTP_200_OK)
        except Participant.DoesNotExist:
            return Response({"detail": "Participant not found in this tournament."}, status=status.HTTP_404_NOT_FOUND)
        