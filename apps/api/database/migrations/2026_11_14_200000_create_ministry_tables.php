<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Modelo de dados do Ministre (docs/ESPECIFICACAO.md, seção 6).
// Igreja -> Ministérios (departamentos) -> Membros. Datas e horários sempre em UTC.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('churches', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('city')->nullable();
            $table->string('slug')->unique();
            $table->enum('plan', ['free', 'pro'])->default('free');
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('ministries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->enum('type', ['worship', 'reception', 'kids', 'media', 'other'])->default('worship');
            $table->string('default_location')->nullable();
            $table->string('logo_path')->nullable();
            $table->json('settings')->nullable();
            $table->timestamps();
        });

        Schema::create('ministry_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ministry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('role', ['leader', 'member'])->default('member');
            $table->enum('status', ['active', 'removed'])->default('active');
            $table->timestamp('joined_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['ministry_id', 'user_id']);
        });

        Schema::create('positions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ministry_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
        });

        Schema::create('member_positions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ministry_member_id')->constrained()->cascadeOnDelete();
            $table->foreignId('position_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['ministry_member_id', 'position_id']);
        });

        Schema::create('event_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ministry_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedTinyInteger('weekday')->nullable(); // 0 = domingo
            $table->time('default_time')->nullable();
            $table->string('default_location')->nullable();
            $table->boolean('is_rehearsal')->default(false);
            $table->timestamps();
        });

        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ministry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('event_type_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->dateTime('starts_at');
            $table->dateTime('ends_at')->nullable();
            $table->string('location')->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['draft', 'published', 'cancelled'])->default('draft');
            $table->boolean('is_rehearsal')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['ministry_id', 'starts_at']);
        });

        Schema::create('event_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ministry_member_id')->constrained()->cascadeOnDelete();
            $table->foreignId('position_id')->constrained()->cascadeOnDelete();
            $table->enum('status', ['pending', 'confirmed', 'declined'])->default('pending');
            $table->string('decline_reason')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamp('reminded_at')->nullable();
            $table->timestamps();
            $table->unique(['event_id', 'ministry_member_id', 'position_id'], 'assignment_unique');
        });

        Schema::create('unavailabilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ministry_member_id')->constrained()->cascadeOnDelete();
            $table->date('starts_on');
            $table->date('ends_on');
            $table->string('reason')->nullable();
            $table->unsignedTinyInteger('recurrence_weekday')->nullable(); // "toda quarta" = 3
            $table->timestamps();
            $table->index(['ministry_member_id', 'starts_on', 'ends_on']);
        });

        Schema::create('songs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ministry_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('artist')->nullable();
            $table->string('original_key', 8);
            $table->unsignedSmallInteger('bpm')->nullable();
            $table->unsignedInteger('duration_sec')->nullable();
            $table->longText('chordpro')->nullable();
            $table->json('tags')->nullable();
            $table->json('links')->nullable();
            $table->unsignedInteger('times_played')->default(0);
            $table->timestamp('last_played_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('event_songs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('song_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->string('key', 8)->nullable();
            $table->string('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('rundown_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->string('title');
            $table->time('planned_time')->nullable();
            $table->unsignedSmallInteger('duration_min')->nullable();
            $table->foreignId('responsible_member_id')->nullable()->constrained('ministry_members')->nullOnDelete();
            $table->string('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ministry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('body');
            $table->boolean('pinned')->default(false);
            $table->timestamp('push_sent_at')->nullable();
            $table->timestamps();
        });

        Schema::create('announcement_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('announcement_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('read_at');
            $table->timestamps();
            $table->unique(['announcement_id', 'user_id']);
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ministry_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('type', 50);
            $table->string('title');
            $table->string('body')->nullable();
            $table->json('data')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'read_at']);
        });

        Schema::create('device_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('expo_token')->unique();
            $table->enum('platform', ['ios', 'android', 'web']);
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();
        });

        Schema::create('invites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ministry_id')->constrained()->cascadeOnDelete();
            $table->string('code', 8)->unique();
            $table->enum('role', ['leader', 'member'])->default('member');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('expires_at');
            $table->unsignedInteger('max_uses')->nullable();
            $table->unsignedInteger('uses')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach ([
            'invites', 'device_tokens', 'notifications', 'announcement_reads', 'announcements',
            'rundown_items', 'event_songs', 'songs', 'unavailabilities', 'event_assignments',
            'events', 'event_types', 'member_positions', 'positions', 'ministry_members',
            'ministries', 'churches',
        ] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
