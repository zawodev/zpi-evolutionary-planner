from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import Organization, Group, UserGroup, UserRecruitment

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    organization_id = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(),
        source='organization',
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'password', 'password2', 'role', 'organization_id')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Passwords do not match!"})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        organization = validated_data.pop('organization', None)
        role_value = validated_data.get('role', 'participant')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            role=role_value,
            password=validated_data['password'],
            organization=organization
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    organization = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'organization')

    def get_organization(self, obj):
        if obj.organization:
            return {'organization_id': str(obj.organization.organization_id), 'organization_name': obj.organization.organization_name}
        return None


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['organization_id', 'organization_name']


class GroupSerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer(read_only=True)
    organization_id = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(),
        source='organization',
        write_only=True
    )

    class Meta:
        model = Group
        fields = ['group_id', 'group_name', 'category', 'organization', 'organization_id']


class UserGroupSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    group = serializers.PrimaryKeyRelatedField(queryset=Group.objects.all())

    class Meta:
        model = UserGroup
        fields = ['user', 'group']


class UserRecruitmentSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_full_name = serializers.SerializerMethodField()
    recruitment_name = serializers.CharField(source='recruitment.recruitment_name', read_only=True)
    
    class Meta:
        model = UserRecruitment
        fields = '__all__'
    
    def get_user_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"


class OfficeCreateUserSerializer(RegisterSerializer):
    """Create a user by an office/admin user.

    Rules enforced:
    - Creator must be office or admin (enforced in view permission).
    - Created user's role must be one of: 'office', 'host', 'participant'.
    - Created user's organization is automatically set to the creator's organization and any provided organization_id is ignored.
    """

    def validate_role(self, value):
        allowed = {'office', 'host', 'participant'}
        if value not in allowed:
            raise serializers.ValidationError(f"Role must be one of: {', '.join(sorted(allowed))}")
        return value

    def create(self, validated_data):
        validated_data.pop('organization', None)
        validated_data.pop('password2', None)

        request = self.context.get('request')
        if request is None or not hasattr(request, 'user'):
            raise serializers.ValidationError('Request user must be provided in serializer context')

        creator = request.user
        if creator.organization is None:
            raise serializers.ValidationError('Creator user has no organization assigned')

        role_value = validated_data.get('role', 'participant')

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role=role_value,
            password=validated_data['password'],
            organization=creator.organization
        )
        return user


class PasswordChangeSerializer(serializers.Serializer):
    """Validate and set a new password for a user.

    Usage: instantiate with data={'password':..., 'password2':...}, call is_valid(),
    then call save(user=the_user) to set the password.
    """
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Passwords do not match"})
        return attrs

    def save(self, user):
        """Set the new password on the provided user instance and save it."""
        password = self.validated_data['password']
        user.set_password(password)
        user.save()
        return user
